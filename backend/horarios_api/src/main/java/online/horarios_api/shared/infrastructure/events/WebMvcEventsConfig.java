package online.horarios_api.shared.infrastructure.events;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcEventsConfig implements WebMvcConfigurer {

    private final AdminMutationInterceptor adminMutationInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminMutationInterceptor).addPathPatterns("/api/**");
    }
}
