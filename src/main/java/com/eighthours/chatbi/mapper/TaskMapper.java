package com.eighthours.chatbi.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.eighthours.chatbi.entity.Task;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TaskMapper extends BaseMapper<Task> {
}
