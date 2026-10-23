package com.eighthours.chatbi.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.eighthours.chatbi.common.AuthContext;
import com.eighthours.chatbi.common.BizException;
import com.eighthours.chatbi.entity.Record;
import com.eighthours.chatbi.entity.Task;
import com.eighthours.chatbi.mapper.RecordMapper;
import com.eighthours.chatbi.statemachine.StateMachine;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecordService {

    private static final long MAX_SIZE = 50L * 1024 * 1024;

    private final RecordMapper recordMapper;
    private final TaskService taskService;

    @Value("${upload.dir}")
    private String uploadDir;

    /**
     * operator 上传数据条目。
     * - 任务必须已分配给自己且处于采集中
     * - 幂等：同一 operator 对同一 task 的同一文件名在「待质检」状态重复上传 → 409
     * - 被打回后重传：新增记录，同一 task 下该 operator 旧的「被打回」记录改为「已重传」
     */
    @Transactional
    public Record upload(long taskId, MultipartFile file, String metaJson) throws IOException {
        Task task = taskService.getById(taskId);
        long userId = AuthContext.userId();
        if (!"operator".equals(AuthContext.role())) {
            throw BizException.forbidden("只有 operator 可上传数据");
        }
        if (task.getAssigneeId() == null || userId != task.getAssigneeId()) {
            throw BizException.forbidden("任务未分配给你，无权上传");
        }
        if (!"采集中".equals(task.getStatus())) {
            throw BizException.conflict("任务当前状态为「" + task.getStatus() + "」，不允许上传");
        }

        String fileName = file.getOriginalFilename();
        if (file.isEmpty() || fileName == null || fileName.isBlank()) {
            throw BizException.unprocessable("文件不能为空");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BizException(413, "文件超过 50MB 上限");
        }

        // 幂等校验：同名文件已有「待质检」记录 → 409
        Long dup = recordMapper.selectCount(new LambdaQueryWrapper<Record>()
                .eq(Record::getTaskId, taskId)
                .eq(Record::getOperatorId, userId)
                .eq(Record::getFileName, fileName)
                .eq(Record::getStatus, "待质检"));
        if (dup > 0) {
            throw BizException.conflict("文件 " + fileName + " 已存在待质检记录，请勿重复上传");
        }

        // 被打回后重传：旧「被打回」记录改为「已重传」，保留审计链
        List<Record> rejected = recordMapper.selectList(new LambdaQueryWrapper<Record>()
                .eq(Record::getTaskId, taskId)
                .eq(Record::getOperatorId, userId)
                .eq(Record::getStatus, "被打回"));
        for (Record old : rejected) {
            StateMachine.check("记录", old.getStatus(), "已重传");
            old.setStatus("已重传");
            recordMapper.updateById(old);
        }

        // 保存文件到 ./uploads/
        Path dir = Path.of(uploadDir, String.valueOf(taskId));
        Files.createDirectories(dir);
        Path target = dir.resolve(System.currentTimeMillis() + "_" + fileName);
        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        Record record = new Record();
        record.setTaskId(taskId);
        record.setOperatorId(userId);
        record.setFilePath(target.toString());
        record.setMetaJson(metaJson);
        record.setStatus("待质检");
        record.setFileName(fileName);
        recordMapper.insert(record);
        return record;
    }

    /** reviewer/admin 查询记录列表，可按 status 过滤 */
    public List<Record> list(String status) {
        if ("operator".equals(AuthContext.role())) {
            throw BizException.forbidden("operator 无权查看全量数据列表");
        }
        LambdaQueryWrapper<Record> wrapper = new LambdaQueryWrapper<>();
        if (status != null && !status.isBlank()) {
            wrapper.eq(Record::getStatus, status);
        }
        return recordMapper.selectList(wrapper.orderByDesc(Record::getId));
    }

    /** reviewer 审核：通过 / 打回（打回 comment 必填 422）；通过后可能触发任务完成流转 */
    @Transactional
    public Record review(long recordId, String result, String comment) {
        String role = AuthContext.role();
        if (!"reviewer".equals(role) && !"admin".equals(role)) {
            throw BizException.forbidden("只有 reviewer/admin 可审核");
        }
        Record record = recordMapper.selectById(recordId);
        if (record == null) {
            throw BizException.notFound("数据条目不存在: " + recordId);
        }
        if (!"通过".equals(result) && !"打回".equals(result)) {
            throw BizException.unprocessable("result 只允许: 通过 / 打回");
        }
        if ("打回".equals(result) && (comment == null || comment.isBlank())) {
            throw BizException.unprocessable("打回时 comment 必填");
        }

        String targetStatus = "通过".equals(result) ? "通过" : "被打回";
        StateMachine.check("记录", record.getStatus(), targetStatus);
        record.setStatus(targetStatus);
        record.setReviewComment(comment);
        record.setReviewedBy(AuthContext.userId());
        record.setReviewedAt(LocalDateTime.now());
        recordMapper.updateById(record);

        if ("通过".equals(result)) {
            taskService.completeIfReached(record.getTaskId());
        }
        return record;
    }

    /** operator 查看自己上传的数据；reviewer/admin 查看全部 */
    public List<Record> myRecords() {
        LambdaQueryWrapper<Record> wrapper = new LambdaQueryWrapper<>();
        if ("operator".equals(AuthContext.role())) {
            wrapper.eq(Record::getOperatorId, AuthContext.userId());
        }
        return recordMapper.selectList(wrapper.orderByDesc(Record::getId));
    }
}
