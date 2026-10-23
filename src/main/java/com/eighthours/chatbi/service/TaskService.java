package com.eighthours.chatbi.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.eighthours.chatbi.common.AuthContext;
import com.eighthours.chatbi.common.BizException;
import com.eighthours.chatbi.entity.Record;
import com.eighthours.chatbi.entity.Task;
import com.eighthours.chatbi.entity.User;
import com.eighthours.chatbi.mapper.RecordMapper;
import com.eighthours.chatbi.mapper.TaskMapper;
import com.eighthours.chatbi.mapper.UserMapper;
import com.eighthours.chatbi.statemachine.StateMachine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskMapper taskMapper;
    private final RecordMapper recordMapper;
    private final UserMapper userMapper;

    /** 管理端（admin/reviewer）可创建任务 */
    public Task create(String name, String station, Integer targetCount, long adminId) {
        requireManager();
        Task task = new Task();
        task.setName(name);
        task.setStation(station);
        task.setTargetCount(targetCount);
        task.setStatus("待分配");
        task.setCreatedBy(adminId);
        task.setCreatedAt(LocalDateTime.now());
        taskMapper.insert(task);
        return task;
    }

    /** operator 只见分配给自己的任务，admin/reviewer 见全部 */
    public List<Task> list() {
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<>();
        if ("operator".equals(AuthContext.role())) {
            wrapper.eq(Task::getAssigneeId, AuthContext.userId());
        }
        return taskMapper.selectList(wrapper.orderByDesc(Task::getCreatedAt));
    }

    /** 管理端分配操作员：待分配 → 采集中 */
    public Task assign(long taskId, long operatorId) {
        requireManager();
        Task task = getById(taskId);
        User operator = userMapper.selectById(operatorId);
        if (operator == null || !"operator".equals(operator.getRole())) {
            throw BizException.notFound("操作员不存在或角色不对: " + operatorId);
        }
        StateMachine.check("任务", task.getStatus(), "采集中");
        task.setStatus("采集中");
        task.setAssigneeId(operatorId);
        taskMapper.updateById(task);
        return task;
    }

    /** 任务详情：含完成数/目标数与该任务的数据条目列表（operator 仅限自己的任务） */
    public Map<String, Object> detail(long taskId) {
        Task task = getById(taskId);
        if ("operator".equals(AuthContext.role())
                && (task.getAssigneeId() == null || AuthContext.userId() != task.getAssigneeId())) {
            throw BizException.forbidden("无权查看他人任务");
        }
        List<Record> records;
        if ("operator".equals(AuthContext.role())) {
            records = recordMapper.selectList(new LambdaQueryWrapper<Record>()
                    .eq(Record::getTaskId, taskId)
                    .eq(Record::getOperatorId, AuthContext.userId()));
        } else {
            records = recordMapper.selectList(new LambdaQueryWrapper<Record>()
                    .eq(Record::getTaskId, taskId));
        }
        long done = records.stream().filter(r -> "通过".equals(r.getStatus())).count();

        Map<String, Object> detail = new HashMap<>();
        detail.put("task", task);
        detail.put("doneCount", done);
        detail.put("targetCount", task.getTargetCount());
        detail.put("records", records);
        return detail;
    }

    /** 审核通过后调用：通过数 == 目标数 时任务 采集中 → 已完成 */
    @Transactional
    public void completeIfReached(long taskId) {
        Task task = getById(taskId);
        if (!"采集中".equals(task.getStatus())) {
            return;
        }
        Long passed = recordMapper.selectCount(new LambdaQueryWrapper<Record>()
                .eq(Record::getTaskId, taskId)
                .eq(Record::getStatus, "通过"));
        if (passed >= task.getTargetCount()) {
            StateMachine.check("任务", task.getStatus(), "已完成");
            task.setStatus("已完成");
            taskMapper.updateById(task);
        }
    }

    public Task getById(long taskId) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw BizException.notFound("任务不存在: " + taskId);
        }
        return task;
    }

    private void requireRole(String role) {
        if (!role.equals(AuthContext.role())) {
            throw BizException.forbidden("需要 " + role + " 角色");
        }
    }

    /** 管理端角色（admin/reviewer） */
    private void requireManager() {
        String role = AuthContext.role();
        if (!"admin".equals(role) && !"reviewer".equals(role)) {
            throw BizException.forbidden("需要管理端角色（admin/reviewer）");
        }
    }
}
