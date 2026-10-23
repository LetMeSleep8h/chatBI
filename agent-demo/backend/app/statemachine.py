"""服务端集中状态流转校验：非法跳转返回 409。"""

TRANSITIONS: dict[str, dict[str, set[str]]] = {
    "task": {
        "待分配": {"采集中"},
        "采集中": {"待质检"},
        "待质检": {"已交付"},
    },
    "record": {
        "待质检": {"通过", "被打回"},
        "被打回": {"已重传"},
    },
}


def allowed(kind: str, src: str, dst: str) -> bool:
    return dst in TRANSITIONS.get(kind, {}).get(src, set())


def check(kind: str, src: str, dst: str) -> None:
    from fastapi import HTTPException

    if not allowed(kind, src, dst):
        raise HTTPException(409, f"状态流转非法：不允许从「{src}」变更为「{dst}」")
