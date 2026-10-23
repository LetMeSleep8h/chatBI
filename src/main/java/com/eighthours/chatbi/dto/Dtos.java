package com.eighthours.chatbi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class Dtos {

    private Dtos() {
    }

    @Data
    public static class RegisterReq {
        @NotBlank
        private String name;
        @NotBlank
        private String password;
    }

    @Data
    public static class LoginReq {
        @NotBlank
        private String name;
        @NotBlank
        private String password;
    }

    @Data
    public static class LoginResp {
        private String token;
        private String name;
        private String role;
    }

    @Data
    public static class CreateTaskReq {
        @NotBlank
        private String name;
        @NotBlank
        private String station;
        private Integer targetCount;
    }

    @Data
    public static class AssignReq {
        private Long operatorId;
    }

    @Data
    public static class ReviewReq {
        /** 通过 / 打回 */
        private String result;
        private String comment;
    }
}
