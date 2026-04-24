package online.horarios_api.shared.domain.model;

import java.util.List;
import java.util.function.Function;

/**
 * Paginated result envelope used by query use cases and controllers.
 *
 * @param content    Items in the current page.
 * @param page       Current 1-based page number.
 * @param pageSize   Maximum items per page.
 * @param totalCount Total items matching the query across all pages.
 * @param totalPages Total number of pages (ceil(totalCount / pageSize)).
 */
public record Page<T>(
        List<T> content,
        int page,
        int pageSize,
        long totalCount,
        int totalPages) {

    public static <T> Page<T> of(List<T> content, int page, int pageSize, long totalCount) {
        int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalCount / pageSize) : 0;
        return new Page<>(content, page, pageSize, totalCount, totalPages);
    }

    public <U> Page<U> map(Function<T, U> mapper) {
        return new Page<>(
                content.stream().map(mapper).toList(),
                page,
                pageSize,
                totalCount,
                totalPages);
    }
}
