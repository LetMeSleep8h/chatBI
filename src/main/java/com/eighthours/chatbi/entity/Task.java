package com.eighthours.chatbi.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
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

    /** 机器人类型 */
    private String robotType;

    private Integer targetCount;

    private Integer collectedCount;

    /** 待分配 → 采集中 → 待质检 → 已交付 */
    private String status;

    private Long assigneeId;

    /** 负责操作员姓名（联表展示用，非表字段） */
    @TableField(exist = false)
    private String assigneeName;

    private Long createdBy;

    private LocalDateTime createdAt;
}
