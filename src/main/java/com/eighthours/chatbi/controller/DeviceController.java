package com.eighthours.chatbi.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.eighthours.chatbi.common.Result;
import com.eighthours.chatbi.entity.Device;
import com.eighthours.chatbi.mapper.DeviceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceMapper deviceMapper;

    /** 工位设备状态（本期为假数据，接口留好，后续接真实设备心跳） */
    @GetMapping("/devices")
    public Result<List<Device>> list() {
        return Result.ok(deviceMapper.selectList(
                new LambdaQueryWrapper<Device>().orderByAsc(Device::getId)));
    }
}
