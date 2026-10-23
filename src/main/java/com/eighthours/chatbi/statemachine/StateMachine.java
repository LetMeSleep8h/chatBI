package com.eighthours.chatbi.statemachine;

import com.eighthours.chatbi.common.BizException;

import java.util.Map;
import java.util.Set;

/**
 * 集中管理所有状态流转规则。
 * 任务状态：待分配 → 采集中 → 待质检 → 已交付
 * 记录状态：待质检 → 通过 / 被打回；被打回的记录重传后 → 已重传（原记录）
 */
public final class StateMachine {

    /** type → (from → 允许的 to 集合) */
    private static final Map<String, Map<String, Set<String>>> TRANSITIONS = Map.of(
            "任务", Map.of(
                    "待分配", Set.of("采集中"),
                    "采集中", Set.of("待质检"),
                    "待质检", Set.of("已交付")),
            "记录", Map.of(
                    "待质检", Set.of("通过", "被打回"),
                    "被打回", Set.of("已重传"))
    );

    private StateMachine() {
    }

    /** 校验 from → to 是否为合法流转，非法返回 409 */
    public static void check(String type, String from, String to) {
        if (!allowed(type, from, to)) {
            throw BizException.conflict(
                    String.format("%s状态流转非法：不允许从「%s」变更为「%s」", type, from, to));
        }
    }

    public static boolean allowed(String type, String from, String to) {
        Set<String> targets = TRANSITIONS.get(type).get(from);
        return targets != null && targets.contains(to);
    }
}
