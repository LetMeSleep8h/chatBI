package com.eighthours.chatbi.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.eighthours.chatbi.common.AuthContext;
import com.eighthours.chatbi.common.BizException;
import com.eighthours.chatbi.entity.Device;
import com.eighthours.chatbi.entity.Record;
import com.eighthours.chatbi.entity.Task;
import com.eighthours.chatbi.entity.User;
import com.eighthours.chatbi.mapper.DeviceMapper;
import com.eighthours.chatbi.mapper.RecordMapper;
import com.eighthours.chatbi.mapper.TaskMapper;
import com.eighthours.chatbi.mapper.UserMapper;
import com.eighthours.chatbi.statemachine.StateMachine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskMapper taskMapper;
    private final RecordMapper recordMapper;
    private final UserMapper userMapper;
    private final DeviceMapper deviceMapper;

    /** 管理端（admin）创建任务 */
    public Task create(String name, String station, String robotType, Integer targetCount, long adminId) {
        requireAdmin();
        Task task = new Task();
        task.setName(name);
        task.setStation(station);
        task.setRobotType(robotType);
        task.setTargetCount(targetCount);
        task.setCollectedCount(0);
        task.setStatus("待分配");
        task.setCreatedBy(adminId);
        task.setCreatedAt(LocalDateTime.now());
        taskMapper.insert(task);
        return task;
    }

    /** operator 只见分配给自己的任务，admin/reviewer 见全部；附操作员姓名 */
    public List<Task> list() {
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<>();
        if ("operator".equals(AuthContext.role())) {
            wrapper.eq(Task::getAssigneeId, AuthContext.userId());
        }
        List<Task> tasks = taskMapper.selectList(wrapper.orderByDesc(Task::getCreatedAt));
        fillAssigneeNames(tasks);
        return tasks;
    }

    /** admin 分配操作员：待分配 → 采集中 */
    public Task assign(long taskId, long operatorId) {
        requireAdmin();
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

    /** admin 交付：待质检 → 已交付 */
    public Task deliver(long taskId) {
        requireAdmin();
        Task task = getById(taskId);
        StateMachine.check("任务", task.getStatus(), "已交付");
        task.setStatus("已交付");
        taskMapper.updateById(task);
        return task;
    }

    /** 任务详情：含已采数/目标数与该任务的数据条目列表（operator 仅限自己的任务） */
    public Map<String, Object> detail(long taskId) {
        Task task = getById(taskId);
        if ("operator".equals(AuthContext.role())
                && (task.getAssigneeId() == null || AuthContext.userId() != task.getAssigneeId())) {
            throw BizException.forbidden("无权查看他人任务");
        }
        LambdaQueryWrapper<Record> wrapper = new LambdaQueryWrapper<Record>().eq(Record::getTaskId, taskId);
        if ("operator".equals(AuthContext.role())) {
            wrapper.eq(Record::getOperatorId, AuthContext.userId());
        }
        List<Record> records = recordMapper.selectList(wrapper.orderByDesc(Record::getId));

        Map<Long, String> names = userMapper.selectList(null).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        records.forEach(r -> r.setDataUrl("/records/" + r.getId() + "/download"));

        Map<String, Object> detail = new HashMap<>();
        detail.put("task", task);
        detail.put("doneCount", records.stream().filter(r -> "通过".equals(r.getStatus())).count());
        detail.put("targetCount", task.getTargetCount());
        detail.put("records", records);
        detail.put("operatorNames", names);
        return detail;
    }

    /** 顶部统计条：进行中任务数 / 今日已采条数 / 待质检条数 / 在线工位数 */
    public Map<String, Object> stats() {
        Long ongoing = taskMapper.selectCount(new LambdaQueryWrapper<Task>()
                .in(Task::getStatus, "采集中", "待质检"));
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        Long todayCollected = recordMapper.selectCount(new LambdaQueryWrapper<Record>()
                .ge(Record::getCreatedAt, todayStart));
        Long pendingReview = recordMapper.selectCount(new LambdaQueryWrapper<Record>()
                .eq(Record::getStatus, "待质检"));
        Long onlineStations = deviceMapper.selectCount(new LambdaQueryWrapper<Device>()
                .eq(Device::getStatus, "在线"));

        Map<String, Object> stats = new HashMap<>();
        stats.put("ongoingTasks", ongoing);
        stats.put("todayCollected", todayCollected);
        stats.put("pendingReview", pendingReview);
        stats.put("onlineStations", onlineStations);
        return stats;
    }

    /** 上传后调用：已采数达标时任务自动 采集中 → 待质检 */
    @Transactional
    public void submitIfReached(long taskId) {
        Task task = getById(taskId);
        if (!"采集中".equals(task.getStatus())) {
            return;
        }
        if (task.getCollectedCount() >= task.getTargetCount()) {
            StateMachine.check("任务", task.getStatus(), "待质检");
            task.setStatus("待质检");
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

    private void fillAssigneeNames(List<Task> tasks) {
        List<Long> ids = tasks.stream().map(Task::getAssigneeId).filter(java.util.Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return;
        }
        Map<Long, String> names = userMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));
        tasks.forEach(t -> t.setAssigneeName(names.get(t.getAssigneeId())));
    }

    private void requireAdmin() {
        if (!"admin".equals(AuthContext.role())) {
            throw BizException.forbidden("需要 admin 角色");
        }
    }
}
