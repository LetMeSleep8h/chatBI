package com.eighthours.chatbi.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("records")
public class Record {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long taskId;

    private Long operatorId;

    /** 数据文件路径（下载经 /records/{id}/download） */
    private String dataUrl;

    /** 视频 / 触觉 / 关节角度 */
    private String dataType;

    /** 工位号/采集时间/备注 等 JSON */
    private String metaJson;

    /** 待质检 / 通过 / 被打回 / 已重传 */
    private String status;

    private String reviewComment;

    private Long reviewedBy;

    private LocalDateTime reviewedAt;

    /** 上传时间（审计） */
    private LocalDateTime createdAt;

    /** 原始文件名，用于幂等判断与下载命名 */
    private String fileName;
}
