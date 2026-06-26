package online.horarios_api.auth.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import online.horarios_api.auth.infrastructure.in.web.FrontendRedirectResolver;
import online.horarios_api.shared.infrastructure.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("FrontendRedirectResolver — resolución de origen permitido")
class FrontendRedirectResolverTest {

    private static final String ALLOWED = "https://app.planneruc.com";
    private static final String FALLBACK = "https://app.planneruc.com";
    private static final String SESSION_KEY = "oauth_frontend_origin";

    private FrontendRedirectResolver resolver;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties(
                new AppProperties.FrontendProperties(FALLBACK),
                new AppProperties.SecurityProperties(new AppProperties.SecurityProperties.CookieProperties(true)),
                new AppProperties.CorsProperties(List.of(ALLOWED, "http://localhost:3000"))
        );
        resolver = new FrontendRedirectResolver(props);
    }

    @Test
    @DisplayName("recuerda un redirect_uri permitido en la sesión")
    void remembersAllowedRedirectUri() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getParameter("redirect_uri")).thenReturn("http://localhost:3000/callback?x=1");
        when(request.getSession(true)).thenReturn(session);

        resolver.rememberRequestedFrontend(request);

        verify(session).setAttribute(SESSION_KEY, "http://localhost:3000");
    }

    @Test
    @DisplayName("ignora un origen no permitido")
    void ignoresDisallowedOrigin() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getParameter("redirect_uri")).thenReturn("https://evil.example.com");
        lenient().when(request.getHeader("Origin")).thenReturn(null);
        lenient().when(request.getHeader("Referer")).thenReturn(null);

        resolver.rememberRequestedFrontend(request);

        verify(request, never()).getSession(true);
    }

    @Test
    @DisplayName("no hace nada cuando no hay candidato")
    void noCandidateDoesNothing() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getParameter("redirect_uri")).thenReturn(null);
        when(request.getHeader("Origin")).thenReturn(null);
        when(request.getHeader("Referer")).thenReturn(null);

        resolver.rememberRequestedFrontend(request);

        verify(request, never()).getSession(true);
    }

    @Test
    @DisplayName("toma el candidato del header Origin cuando no hay parámetro")
    void remembersFromOriginHeader() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getParameter("redirect_uri")).thenReturn(null);
        when(request.getHeader("Origin")).thenReturn(ALLOWED);
        when(request.getSession(true)).thenReturn(session);

        resolver.rememberRequestedFrontend(request);

        verify(session).setAttribute(SESSION_KEY, ALLOWED);
    }

    @Test
    @DisplayName("resolveBaseUrl devuelve el valor guardado en sesión y lo limpia")
    void resolveFromSession() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute(SESSION_KEY)).thenReturn(ALLOWED);

        String result = resolver.resolveBaseUrl(request);

        assertThat(result).isEqualTo(ALLOWED);
        verify(session).removeAttribute(SESSION_KEY);
    }

    @Test
    @DisplayName("resolveBaseUrl usa el header Origin cuando no hay sesión")
    void resolveFromHeader() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getSession(false)).thenReturn(null);
        when(request.getHeader("Origin")).thenReturn("http://localhost:3000");

        String result = resolver.resolveBaseUrl(request);

        assertThat(result).isEqualTo("http://localhost:3000");
    }

    @Test
    @DisplayName("resolveBaseUrl cae al frontend por defecto sin pistas")
    void resolveFallback() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getSession(false)).thenReturn(null);
        when(request.getHeader("Origin")).thenReturn(null);
        when(request.getHeader("Referer")).thenReturn(null);

        String result = resolver.resolveBaseUrl(request);

        assertThat(result).isEqualTo(FALLBACK);
    }

    @Test
    @DisplayName("resolveBaseUrl ignora un valor de sesión no permitido y usa el Referer")
    void resolveSessionInvalidFallsBackToReferer() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute(SESSION_KEY)).thenReturn("https://evil.example.com");
        when(request.getHeader("Origin")).thenReturn(null);
        when(request.getHeader("Referer")).thenReturn("http://localhost:3000/login");

        String result = resolver.resolveBaseUrl(request);

        assertThat(result).isEqualTo("http://localhost:3000");
    }
}
