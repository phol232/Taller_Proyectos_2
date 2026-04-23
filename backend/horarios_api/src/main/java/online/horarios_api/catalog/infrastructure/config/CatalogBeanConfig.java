package online.horarios_api.catalog.infrastructure.config;

import online.horarios_api.catalog.application.usecase.CatalogService;
import online.horarios_api.catalog.domain.port.in.CatalogCommandUseCase;
import online.horarios_api.catalog.domain.port.in.CatalogQueryUseCase;
import online.horarios_api.catalog.domain.port.out.CatalogPort;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class CatalogBeanConfig {

    /** Bean concreto del servicio. @Primary para que Spring lo prefiera
     *  cuando haya ambigüedad de tipo CatalogService. */
    @Bean
    @Primary
    public CatalogService catalogService(CatalogPort catalogPort) {
        return new CatalogService(catalogPort);
    }

    @Bean
    public CatalogQueryUseCase catalogQueryUseCase(@Qualifier("catalogService") CatalogService service) {
        return service;
    }

    @Bean
    public CatalogCommandUseCase catalogCommandUseCase(@Qualifier("catalogService") CatalogService service) {
        return service;
    }
}
