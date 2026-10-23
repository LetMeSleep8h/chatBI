"""首次启动种子数据：默认账号 + 3 个任务 + 10 条不同状态记录，保证看板打开不空。"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .models import Record, Task, User
from .security import hash_password

STATIONS = ["A-01", "B-02", "C-01"]  # 3 个工位（设备管理 P1 接入，本期仅用于统计假数据）
ONLINE_STATIONS_FAKE = 2  # stats 里在线工位数的假数据


def seed_if_empty(db: Session) -> None:
    if db.query(User).count() > 0:
        return

    admin = User(name="admin", password_hash=hash_password("12345678"), role="reviewer")
    operator1 = User(name="operator1", password_hash=hash_password("12345678"), role="operator")
    user = User(name="user", password_hash=hash_password("12345678"), role="operator")
    user1 = User(name="user1", password_hash=hash_password("12345678"), role="operator")
    user2 = User(name="user2", password_hash=hash_password("12345678"), role="operator")
    b1 = User(name="B1", password_hash=hash_password("12345678"), role="customer")  # 只看 user1 的数据
    b2 = User(name="B2", password_hash=hash_password("12345678"), role="customer")  # 只看 user2 的数据
    db.add_all([admin, operator1, user, user1, user2, b1, b2])
    db.flush()

    now = datetime.now()

    t1 = Task(name="车间A抓取-放置技能数据采集", station="A-01", robot_type="UR5e",
              target_count=4, collected_count=1, status="采集中",
              assignee_id=operator1.id, created_by=admin.id, created_at=now - timedelta(hours=5))
    t2 = Task(name="车间B双臂协作演示数据集", station="B-02", robot_type="xArm7",
              target_count=3, collected_count=2, status="待质检",
              assignee_id=operator1.id, created_by=admin.id, created_at=now - timedelta(hours=8))
    t3 = Task(name="开瓶盖技能触觉轨迹采集", station="C-01", robot_type="自研R1",
              target_count=3, collected_count=3, status="已交付",
              assignee_id=operator1.id, created_by=admin.id, created_at=now - timedelta(days=1))
    db.add_all([t1, t2, t3])
    db.flush()

    records = [
        # 任务1（采集中 1/4）：1 通过 + 1 待质检 + 1 被打回
        Record(task_id=t1.id, operator_id=operator1.id, data_type="视频", file_path="seed/a1.mp4",
               meta_json='{"station":"A-01","collectedAt":"09:30"}', status="通过",
               reviewed_by=admin.id, reviewed_at=now - timedelta(hours=2),
               created_at=now - timedelta(hours=4), file_name="a1.mp4"),
        Record(task_id=t1.id, operator_id=operator1.id, data_type="视频", file_path="seed/a2.mp4",
               meta_json='{"station":"A-01","collectedAt":"10:10"}', status="待质检",
               created_at=now - timedelta(hours=3), file_name="a2.mp4"),
        Record(task_id=t1.id, operator_id=operator1.id, data_type="关节角度", file_path="seed/a3.csv",
               meta_json='{"station":"A-01","collectedAt":"10:40"}', status="被打回",
               review_comment="关节数据缺帧，请重新采集", reviewed_by=admin.id,
               reviewed_at=now - timedelta(hours=1), created_at=now - timedelta(hours=2),
               file_name="a3.csv"),
        # 任务2（待质检 2/3）：2 通过 + 1 待质检
        Record(task_id=t2.id, operator_id=operator1.id, data_type="触觉", file_path="seed/b1.bin",
               meta_json='{"station":"B-02"}', status="通过",
               reviewed_by=admin.id, reviewed_at=now - timedelta(hours=3),
               created_at=now - timedelta(hours=6), file_name="b1.bin"),
        Record(task_id=t2.id, operator_id=operator1.id, data_type="视频", file_path="seed/b2.mp4",
               meta_json='{"station":"B-02"}', status="通过",
               reviewed_by=admin.id, reviewed_at=now - timedelta(hours=3),
               created_at=now - timedelta(hours=5), file_name="b2.mp4"),
        Record(task_id=t2.id, operator_id=operator1.id, data_type="触觉", file_path="seed/b3.bin",
               meta_json='{"station":"B-02"}', status="待质检",
               created_at=now - timedelta(hours=4), file_name="b3.bin"),
        # 补充任务2 一条已重传历史（审计链示例）
        Record(task_id=t2.id, operator_id=operator1.id, data_type="视频", file_path="seed/b0.mp4",
               meta_json='{"station":"B-02"}', status="已重传",
               review_comment="画面遮挡", reviewed_by=admin.id,
               reviewed_at=now - timedelta(hours=7),
               created_at=now - timedelta(hours=8), file_name="b0.mp4"),
        # 任务3（已交付 3/3）：3 通过
        Record(task_id=t3.id, operator_id=operator1.id, data_type="触觉", file_path="seed/c1.bin",
               meta_json='{"station":"C-01"}', status="通过",
               reviewed_by=admin.id, reviewed_at=now - timedelta(days=1),
               created_at=now - timedelta(days=1, hours=2), file_name="c1.bin"),
        Record(task_id=t3.id, operator_id=operator1.id, data_type="关节角度", file_path="seed/c2.csv",
               meta_json='{"station":"C-01"}', status="通过",
               reviewed_by=admin.id, reviewed_at=now - timedelta(days=1),
               created_at=now - timedelta(days=1, hours=1), file_name="c2.csv"),
        Record(task_id=t3.id, operator_id=operator1.id, data_type="视频", file_path="seed/c3.mp4",
               meta_json='{"station":"C-01"}', status="通过",
               reviewed_by=admin.id, reviewed_at=now - timedelta(hours=20),
               created_at=now - timedelta(days=1), file_name="c3.mp4"),
    ]
    db.add_all(records)
    db.commit()
