package com.eighthours.dataplatform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tasks")
public class Task {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String station;

    private Integer targetCount;

    /** 待分配 → 采集中 → 已完成 */
    private String status;

    private Long assigneeId;

    private Long createdBy;

    private LocalDateTime createdAt;
}
