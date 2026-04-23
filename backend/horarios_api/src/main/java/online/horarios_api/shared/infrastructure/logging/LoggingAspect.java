package online.horarios_api.shared.infrastructure.logging;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Slf4j
public class LoggingAspect {

    // Intercepts all use case (application layer) methods
    @Around("execution(* online.horarios_api.*.application.usecase.*.*(..))")
    public Object logUseCaseExecution(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String clazz = pjp.getTarget().getClass().getSimpleName();
        String method = sig.getName();

        log.info("[{}] → {}()", clazz, method);
        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;
            log.info("[{}] ← {}() completado en {} ms", clazz, method, elapsed);
            return result;
        } catch (Throwable ex) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("[{}] ✗ {}() falló en {} ms — {}: {}",
                    clazz, method, elapsed, ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    // Intercepts all web controllers
    @Around("execution(* online.horarios_api.*.infrastructure.in.web.*Controller.*(..))")
    public Object logControllerExecution(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String clazz = pjp.getTarget().getClass().getSimpleName();
        String method = sig.getName();

        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;
            log.debug("[{}] {} → {} ms", clazz, method, elapsed);
            return result;
        } catch (Throwable ex) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("[{}] {} falló en {} ms — {}", clazz, method, elapsed, ex.getMessage());
            throw ex;
        }
    }
}
