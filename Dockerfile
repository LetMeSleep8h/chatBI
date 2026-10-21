# 阶段一：构建
FROM docker.m.daocloud.io/library/maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# 阿里源配置（settings.xml 方式，Maven 3.9 唯一认的方式）
RUN mkdir -p /root/.m2 && echo '<?xml version="1.0" encoding="UTF-8"?>\
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">\
  <mirrors>\
    <mirror>\
      <id>aliyun</id>\
      <mirrorOf>central</mirrorOf>\
      <url>https://maven.aliyun.com/repository/public</url>\
    </mirror>\
  </mirrors>\
</settings>' > /root/.m2/settings.xml

# 先只拷 pom，把依赖下载单独成层
COPY pom.xml .
RUN mvn dependency:go-offline -DskipTests

# 再拷代码，只有这层随代码变化
COPY src ./src
RUN mvn package -DskipTests

# 阶段二：运行（不变）
FROM docker.m.daocloud.io/library/eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8090
ENTRYPOINT ["java", "-jar", "app.jar"]