import json
import os
import shutil
from typing import Optional
from datetime import datetime
from pathlib import Path

from fastapi import (APIRouter, Depends, FastAPI, File, Form, HTTPException, Request,
                     UploadFile, WebSocket, WebSocketDisconnect)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Record, Task, User
from .seed import ONLINE_STATIONS_FAKE, seed_if_empty
from .security import current_user, hash_password, issue_token, parse_token
from .statemachine import allowed, check

app = FastAPI(title="具身智能数据采集平台（最小原型）", docs_url="/agent/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_SIZE = 50 * 1024 * 1024
DATA_TYPES = {"视频", "触觉", "关节角度"}


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


# ---------------- auth ----------------

# 接口同时挂 /api 与 /agent/api：单容器直连时前端 baseURL=/agent/api，
# 经反向代理剥前缀后走 /api（见 nginx-location.conf）
api = APIRouter()


class LoginReq(BaseModel):
    name: str
    password: str


@api.post("/auth/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.name == req.name).first()
    if user is None or user.password_hash != hash_password(req.password):
        raise HTTPException(401, "用户名或密码错误")
    return {"token": issue_token(user.id, user.role), "name": user.name, "role": user.role}


@api.get("/auth/me")
def me(user=Depends(current_user), db: Session = Depends(get_db)):
    u = db.get(User, user["user_id"])
    if u is None:
        raise HTTPException(404, "用户不存在")
    return {"id": u.id, "name": u.name, "role": u.role}


# ---------------- tasks ----------------


def require_manager(user):
    """admin 账号在本系统角色为 reviewer，具备管理能力；统一放行 admin/reviewer。"""
    if user["role"] not in ("admin", "reviewer"):
        raise HTTPException(403, "需要管理端角色（admin/reviewer）")


def task_out(t: Task, names: dict[int, str]) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "station": t.station,
        "robot_type": t.robot_type,
        "target_count": t.target_count,
        "collected_count": t.collected_count,
        "status": t.status,
        "assignee_id": t.assignee_id,
        "assignee_name": names.get(t.assignee_id) if t.assignee_id else None,
        "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S"),
    }


def record_out(r: Record, names: dict[int, str]) -> dict:
    return {
        "id": r.id,
        "task_id": r.task_id,
        "operator_id": r.operator_id,
        "operator_name": names.get(r.operator_id, str(r.operator_id)),
        "data_type": r.data_type,
        "status": r.status,
        "review_comment": r.review_comment,
        "reviewed_at": r.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if r.reviewed_at else None,
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "file_name": r.file_name,
        "meta_json": r.meta_json,
    }


def user_names(db: Session) -> dict[int, str]:
    return {u.id: u.name for u in db.query(User).all()}


class CreateTaskReq(BaseModel):
    name: str
    station: str
    robot_type: str
    target_count: int


@api.get("/tasks")
def list_tasks(user=Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(Task).order_by(Task.created_at.desc())
    if user["role"] == "operator":
        q = q.filter(Task.assignee_id == user["user_id"])
    names = user_names(db)
    return [task_out(t, names) for t in q.all()]


@api.post("/tasks", status_code=200)
def create_task(req: CreateTaskReq, user=Depends(current_user), db: Session = Depends(get_db)):
    require_manager(user)
    t = Task(name=req.name, station=req.station, robot_type=req.robot_type,
             target_count=req.target_count, collected_count=0, status="待分配",
             created_by=user["user_id"])
    db.add(t)
    db.commit()
    return task_out(t, user_names(db))


class AssignReq(BaseModel):
    operator_id: int


@api.patch("/tasks/{task_id}/assign")
def assign(task_id: int, req: AssignReq, user=Depends(current_user), db: Session = Depends(get_db)):
    require_manager(user)
    t = db.get(Task, task_id)
    if t is None:
        raise HTTPException(404, f"任务不存在: {task_id}")
    op = db.get(User, req.operator_id)
    if op is None or op.role != "operator":
        raise HTTPException(404, f"操作员不存在或角色不对: {req.operator_id}")
    check("task", t.status, "采集中")
    t.status = "采集中"
    t.assignee_id = op.id
    db.commit()
    return task_out(t, user_names(db))


@api.get("/tasks/{task_id}")
def task_detail(task_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    t = db.get(Task, task_id)
    if t is None:
        raise HTTPException(404, f"任务不存在: {task_id}")
    if user["role"] == "operator" and t.assignee_id != user["user_id"]:
        raise HTTPException(403, "无权查看他人任务")
    names = user_names(db)
    records = (
        db.query(Record)
        .filter(Record.task_id == task_id, Record.status != "已重传")
        .order_by(Record.id.desc())
        .all()
        if user["role"] != "operator"
        else db.query(Record)
        .filter(Record.task_id == task_id, Record.operator_id == user["user_id"])
        .order_by(Record.id.desc())
        .all()
    )
    return {
        "task": task_out(t, names),
        "progress": {"collected": t.collected_count, "target": t.target_count},
        "records": [record_out(r, names) for r in records],
    }


# ---------------- records ----------------


@api.post("/records")
async def upload_record(
    task_id: int = Form(...),
    data_type: Optional[str] = Form(None),  # mock 模式由服务端自动轮换生成
    meta: str = Form("{}"),
    mock: str = Form("false"),
    file: UploadFile = File(None),
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "operator":
        raise HTTPException(403, "只有 operator 可上传数据")
    t = db.get(Task, task_id)
    if t is None:
        raise HTTPException(404, f"任务不存在: {task_id}")
    if t.assignee_id != user["user_id"]:
        raise HTTPException(403, "任务未分配给你，无权上传")  # 防水平越权
    if t.status not in ("采集中", "待质检"):
        raise HTTPException(409, f"任务当前状态为「{t.status}」，不允许上传")
    mock_mode = mock.lower() == "true"
    if not mock_mode and (data_type is None or data_type not in DATA_TYPES):
        raise HTTPException(422, "data_type 只允许: 视频 / 触觉 / 关节角度")
    if not mock_mode:
        # 真实文件上传才校验文件
        if file is None or file.size is None or file.size == 0:
            raise HTTPException(422, "文件不能为空")
        if file.size > MAX_SIZE:
            raise HTTPException(413, "文件超过 50MB 上限")

    # 被打回重传：新增记录，旧「被打回」记录置为「已重传」（审计链）
    for old in (
        db.query(Record)
        .filter(Record.task_id == task_id, Record.operator_id == user["user_id"],
                Record.status == "被打回")
        .all()
    ):
        check("record", old.status, "已重传")
        old.status = "已重传"

    if mock_mode:
        # mock 模式：不需要真实文件，生成一条虚拟数据（模拟工位 SDK 产出）
        r = make_mock_record(db, t, user["user_id"], source="操作员模拟上传")
        t.collected_count += 1
    else:
        target_dir = UPLOAD_DIR / str(task_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        file_name = file.filename or "unnamed"
        dest = target_dir / f"{int(datetime.now().timestamp() * 1000)}_{file_name}"
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        r = Record(task_id=task_id, operator_id=user["user_id"], data_type=data_type,
                   file_path=str(dest), meta_json=meta, status="待质检",
                   created_at=datetime.now(), file_name=file_name)
        db.add(r)

    # 已采条数（非已重传）达标 → 任务自动 采集中 → 待质检
    active = (
        db.query(Record)
        .filter(Record.task_id == task_id, Record.status != "已重传")
        .count()
    )
    if t.status == "采集中" and active >= t.target_count:
        check("task", t.status, "待质检")
        t.status = "待质检"
    db.commit()

    # 入库成功 → WebSocket 广播给管理端实时看板
    operator = db.get(User, user["user_id"])
    await manager.broadcast({
        "type": "record_new",
        "task_id": t.id,
        "task_name": t.name,
        "station": t.station,
        "operator": operator.name if operator else str(user["user_id"]),
        "data_type": r.data_type,
        "record_id": r.id,
        "created_at": r.created_at.strftime("%H:%M:%S"),
        "collected_count": t.collected_count,
        "target_count": t.target_count,
    })
    return record_out(r, user_names(db))


@api.get("/records")
def list_records(task_id: Optional[int] = None, user=Depends(current_user),
                 db: Session = Depends(get_db)):
    q = db.query(Record).order_by(Record.id.desc())
    if user["role"] == "operator":
        q = q.filter(Record.operator_id == user["user_id"])
    elif user["role"] == "customer":
        u = db.get(User, user["user_id"])
        watched = db.query(User).filter(User.name == CUSTOMER_MAP.get(u.name, "")).first()
        q = q.filter(Record.operator_id == (watched.id if watched else -1))
    elif task_id is not None:
        q = q.filter(Record.task_id == task_id)
    names = user_names(db)
    return [record_out(r, names) for r in q.all()]


class ReviewReq(BaseModel):
    result: str  # 通过 / 打回
    comment: Optional[str] = None


@api.patch("/records/{record_id}/review")
def review(record_id: int, req: ReviewReq, user=Depends(current_user),
           db: Session = Depends(get_db)):
    if user["role"] not in ("reviewer", "admin"):
        raise HTTPException(403, "只有 reviewer/admin 可审核")
    r = db.get(Record, record_id)
    if r is None:
        raise HTTPException(404, f"数据条目不存在: {record_id}")
    if req.result not in ("通过", "打回"):
        raise HTTPException(422, "result 只允许: 通过 / 打回")
    if req.result == "打回" and not (req.comment and req.comment.strip()):
        raise HTTPException(422, "打回时 comment 必填")

    dst = "通过" if req.result == "通过" else "被打回"
    check("record", r.status, dst)
    r.status = dst
    r.review_comment = req.comment
    r.reviewed_by = user["user_id"]  # 审计：操作人 + 时间
    r.reviewed_at = datetime.now()

    # 通过 → collected_count+1（mock 生成的记录在产出时已计数，不重复加）；
    # 达标则任务 待质检 → 已交付
    if req.result == "通过":
        t = db.get(Task, r.task_id)
        if not r.file_path.startswith("uploads/mock"):
            t.collected_count += 1
        if t.collected_count >= t.target_count and allowed("task", t.status, "已交付"):
            t.status = "已交付"
    db.commit()
    return record_out(r, user_names(db))


@api.get("/records/{record_id}/download")
def download(record_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    r = db.get(Record, record_id)
    if r is None:
        raise HTTPException(404, f"数据条目不存在: {record_id}")
    if user["role"] == "operator" and r.operator_id != user["user_id"]:
        raise HTTPException(403, "无权下载他人数据")
    if user["role"] == "customer":
        u = db.get(User, user["user_id"])
        watched = db.query(User).filter(User.name == CUSTOMER_MAP.get(u.name, "")).first()
        if watched is None or r.operator_id != watched.id:
            raise HTTPException(403, "客户只能下载自己可见操作员的数据")
    path = Path(r.file_path)
    if not path.exists():
        raise HTTPException(404, "文件不存在")
    return FileResponse(path, filename=r.file_name)


# ---------------- mock 工位产出 ----------------

MOCK_TYPES = ["视频", "触觉", "关节角度"]


def make_mock_record(db: Session, t: Task, operator_id: int, source: str) -> Record:
    """生成一条虚拟数据记录：轮换 data_type，写一个模拟传感器采样的 JSON 文件。"""
    idx = db.query(Record).filter(Record.task_id == t.id).count()
    data_type = MOCK_TYPES[idx % len(MOCK_TYPES)]
    ts = datetime.now()

    r = Record(task_id=t.id, operator_id=operator_id, data_type=data_type,
               file_path="", meta_json=json.dumps({
                   "工位": t.station, "来源": source,
                   "时间": ts.strftime("%Y-%m-%d %H:%M:%S"),
               }, ensure_ascii=False),
               status="待质检", created_at=ts, file_name=f"mock_{t.id}_{idx + 1}.json")
    db.add(r)
    db.flush()  # 拿到自增 id 写进文件内容

    mock_dir = UPLOAD_DIR / "mock"
    mock_dir.mkdir(parents=True, exist_ok=True)
    path = mock_dir / f"{int(ts.timestamp() * 1000)}_{r.id}.json"
    path.write_text(json.dumps({
        "record_id": r.id,
        "task_id": t.id,
        "data_type": data_type,
        "timestamp": ts.isoformat(),
        "sensor_samples": [round(0.5 + 0.1 * ((i + r.id) % 7), 3) for i in range(8)],
    }, ensure_ascii=False), encoding="utf-8")
    r.file_path = str(path)
    return r


class MockIngestReq(BaseModel):
    task_id: int
    count: int = 1


@api.post("/mock/ingest")
async def mock_ingest(req: MockIngestReq, user=Depends(current_user),
                      db: Session = Depends(get_db)):
    """模拟采集工位自动上传（MVP 用它代替工位 SDK），仅管理端可调用。"""
    if user["role"] not in ("admin", "reviewer"):
        raise HTTPException(403, "需要管理端角色（admin/reviewer）")
    t = db.get(Task, req.task_id)
    if t is None:
        raise HTTPException(404, f"任务不存在: {req.task_id}")
    if not 1 <= req.count <= 5:
        raise HTTPException(422, "count 只允许 1~5")

    created = [make_mock_record(db, t, user["user_id"], source="工位自动上传")
               for _ in range(req.count)]
    t.collected_count += req.count
    # 已采达标 → 采集中自动流转 待质检（已交付留到质检全部通过时）
    if t.collected_count >= t.target_count and allowed("task", t.status, "待质检"):
        t.status = "待质检"
    db.commit()
    names = user_names(db)
    for r in created:
        await manager.broadcast({
            "type": "record_new",
            "task_id": t.id,
            "task_name": t.name,
            "station": t.station,
            "operator": names.get(user["user_id"], str(user["user_id"])),
            "data_type": r.data_type,
            "record_id": r.id,
            "created_at": r.created_at.strftime("%H:%M:%S"),
            "collected_count": t.collected_count,
            "target_count": t.target_count,
        })
    return [record_out(r, names) for r in created]


# ---------------- 采集会话（operator 工位控制台） ----------------


class SessionStartReq(BaseModel):
    task_id: int


@api.post("/sessions/start")
async def start_session(req: SessionStartReq, user=Depends(current_user),
                        db: Session = Depends(get_db)):
    """operator 开启指定任务的采集会话：任务须已分配给自己，状态 → 采集中。"""
    if user["role"] != "operator":
        raise HTTPException(403, "只有 operator 可开启采集会话")
    t = db.get(Task, req.task_id)
    if t is None:
        raise HTTPException(404, f"任务不存在: {req.task_id}")
    if t.assignee_id != user["user_id"]:
        raise HTTPException(403, "任务未分配给你，无权开启会话")
    if t.status == "已交付":
        raise HTTPException(409, "任务已交付，无法再采集")
    if t.status == "待分配":
        check("task", t.status, "采集中")
        t.status = "采集中"
    db.commit()
    return {
        "session_id": f"s_{t.id}_{int(datetime.now().timestamp())}",
        "task_id": t.id,
        "task_name": t.name,
        "station": t.station,
        "robot_type": t.robot_type,
        "collected": t.collected_count,
        "target": t.target_count,
        "status": t.status,
        "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


@api.post("/mock/push")
async def mock_push(user=Depends(current_user), db: Session = Depends(get_db)):
    """user 页大按钮：点一下 = 一条模拟数据采集（自动挂到该用户的默认任务）。"""
    if user["role"] != "operator":
        raise HTTPException(403, "只有 operator 可推送模拟数据")
    u = db.get(User, user["user_id"])
    default_name = f"{u.name} 的模拟数据采集"
    t = db.query(Task).filter(Task.created_by == u.id, Task.name == default_name).first()
    if t is None:
        t = Task(name=default_name, station=f"U-{u.name}", robot_type="模拟器",
                 target_count=9999, collected_count=0, status="采集中",
                 assignee_id=u.id, created_by=u.id)
        db.add(t)
        db.flush()
    r = make_mock_record(db, t, u.id, source="用户模拟推送")
    t.collected_count += 1
    db.commit()
    names = user_names(db)
    total = db.query(Record).filter(Record.operator_id == u.id, Record.status != "已重传").count()
    out = record_out(r, names)
    out["total"] = total
    await manager.broadcast({
        "type": "record_new",
        "task_id": t.id,
        "task_name": default_name,
        "station": t.station,
        "operator": u.name,
        "data_type": r.data_type,
        "record_id": r.id,
        "created_at": r.created_at.strftime("%H:%M:%S"),
        "collected_count": t.collected_count,
        "target_count": t.target_count,
    })
    return out


# ---------------- stats ----------------


@api.get("/stats")
def stats(user=Depends(current_user), db: Session = Depends(get_db)):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return {
        "ongoing_tasks": db.query(Task).filter(Task.status.in_(["采集中", "待质检"])).count(),
        "today_collected": db.query(Record).filter(Record.created_at >= today).count(),
        "pending_review": db.query(Record).filter(Record.status == "待质检").count(),
        "online_stations": ONLINE_STATIONS_FAKE,  # 假数据，P1 接设备心跳
    }


# ---------------- WebSocket 实时推送（管理端看板） ----------------


# toB 客户账号 → 可见的操作员（数据隔离演示）
CUSTOMER_MAP = {"B1": "user1", "B2": "user2"}


class Connection:
    """一条 WS 连接；customer 角色带 operator_filter，只收对应操作员的事件。"""

    def __init__(self, ws: WebSocket, operator_filter: Optional[str] = None):
        self.ws = ws
        self.operator_filter = operator_filter


class ConnectionManager:
    """维护 /ws/dashboard 的活跃连接，提供按可见性过滤的广播。"""

    def __init__(self):
        self.active: list[Connection] = []

    async def connect(self, conn: Connection):
        await conn.ws.accept()
        self.active.append(conn)

    def disconnect(self, conn: Connection):
        if conn in self.active:
            self.active.remove(conn)

    async def broadcast(self, message: dict):
        operator = message.get("operator")
        for conn in list(self.active):
            if conn.operator_filter and conn.operator_filter != operator:
                continue  # 客户只能看到自己映射操作员的数据
            try:
                await conn.ws.send_json(message)
            except Exception:
                self.disconnect(conn)


manager = ConnectionManager()


@app.websocket("/ws/dashboard")
@app.websocket("/agent/ws/dashboard")  # 单容器直连前缀（与 /agent/api 对齐）
async def ws_dashboard(ws: WebSocket, db: Session = Depends(get_db)):
    # token 走 query 参数；customer 角色按映射只收对应操作员的推送
    operator_filter = None
    token = ws.query_params.get("token")
    if token:
        try:
            payload = parse_token(token)
            u = db.get(User, payload["user_id"])
            if u is not None:
                operator_filter = CUSTOMER_MAP.get(u.name)  # 非 customer 为 None（看全部）
        except Exception:
            pass
    conn = Connection(ws, operator_filter)
    await manager.connect(conn)
    try:
        while True:
            await ws.receive_text()  # 保活（客户端 ping）
    except WebSocketDisconnect:
        manager.disconnect(conn)


# 双前缀挂载：/api（反代剥前缀后）与 /agent/api（单容器直连）
app.include_router(api, prefix="/api")
app.include_router(api, prefix="/agent/api")

# ---------------- 前端静态托管 ----------------


@app.get("/")
def root():
    return RedirectResponse("/agent/")


# 静态目录可被环境变量覆盖（容器内 Dockerfile 设为 /app/static）
STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(Path(__file__).resolve().parent.parent / "static")))


@app.get("/agent/{full_path:path}", include_in_schema=False)
def spa(full_path: str):
    """静态文件存在则返回文件，否则回退 index.html（SPA history 路由）。"""
    if full_path:
        target = (STATIC_DIR / full_path).resolve()
        if target.is_file() and str(target).startswith(str(STATIC_DIR.resolve())):
            return FileResponse(target)
    return FileResponse(STATIC_DIR / "index.html")
