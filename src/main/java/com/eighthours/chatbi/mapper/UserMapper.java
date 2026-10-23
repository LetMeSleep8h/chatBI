package com.eighthours.chatbi.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.eighthours.chatbi.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
