CREATE TABLE IF NOT EXISTS users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(64)  NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role          VARCHAR(16)  NOT NULL COMMENT 'operator / reviewer / admin'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(128) NOT NULL,
    station      VARCHAR(64)  NOT NULL,
    target_count INT          NOT NULL,
    status       VARCHAR(16)  NOT NULL DEFAULT '待分配' COMMENT '待分配 → 采集中 → 已完成',
    assignee_id  BIGINT       NULL,
    created_by   BIGINT       NOT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS records (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id        BIGINT       NOT NULL,
    operator_id    BIGINT       NOT NULL,
    file_path      VARCHAR(512) NOT NULL,
    meta_json      VARCHAR(2048) NULL COMMENT '工位号/采集时间/备注',
    status         VARCHAR(16)  NOT NULL DEFAULT '待质检' COMMENT '待质检 / 通过 / 被打回 / 已重传',
    review_comment VARCHAR(512) NULL,
    reviewed_by    BIGINT       NULL,
    reviewed_at    DATETIME     NULL,
    file_name      VARCHAR(256) NOT NULL DEFAULT '',
    KEY idx_task (task_id),
    KEY idx_operator_status (operator_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
