import { useEffect, useState } from "react";

const CACHE_TTL = 1000 * 60 * 60; // 1 час

export function useGithubStars(owner, repo) {
    const [stars, setStars] = useState(null);
    const [loading, setLoading] = useState(true);

    const cacheKey = `github-stars:${owner}/${repo}`;

    useEffect(() => {
        let cancelled = false;

        const cached = localStorage.getItem(cacheKey);
        let cacheValue = null;

        if (cached) {
            try {
                const { value, timestamp } = JSON.parse(cached);
                cacheValue = value;
                if (Date.now() - timestamp < CACHE_TTL) {
                    setStars(value);
                    setLoading(false);
                }
            } catch {
                // повреждённый кэш — игнорируем
            }
        }

        fetch(`https://api.github.com/repos/${owner}/${repo}`)
            .then((res) => {
                if (!res.ok) throw new Error("GitHub API error");
                return res.json();
            })
            .then((data) => {
                if (!cancelled) {
                    setStars(data.stargazers_count);
                    setLoading(false);
                    localStorage.setItem(
                        cacheKey,
                        JSON.stringify({
                            value: data.stargazers_count,
                            timestamp: Date.now(),
                        })
                    );
                }
            })
            .catch(() => {
                if (!cancelled) {
                    // Ошибка fetch - используем кэш если есть
                    if (cacheValue != null) {
                        setStars(cacheValue);
                    }
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [owner, repo, cacheKey]);

    return { stars, loading };
}
