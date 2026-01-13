import React from "react";
import { Box, ButtonBase, Tooltip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";

import { useGithubStars } from "../hooks/useGithubStars";

const GitHubIcon = () => (
    <Box
        component="svg"
        aria-hidden="true"
        viewBox="0 0 496 512"
        sx={{
            width: 18,
            height: 18,
            fill: "currentColor", // адаптируется под color родителя
            flexShrink: 0,
        }}
    >
        <path d="M244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8z" />
    </Box>
);


const GitHubButton = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const { stars, loading } = useGithubStars(
        "Art-Rock-Climber",
        "InfDimTable_Demo-for-SMART-goals"
    );


    return (
        <Tooltip title="Поставить звезду на GitHub">
            <ButtonBase
                component="a"
                href="https://github.com/Art-Rock-Climber/InfDimTable_Demo-for-SMART-goals"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                    fontFamily: "Inter, sans-serif",
                    px: "25px",
                    py: "12px",
                    borderRadius: "100px",
                    fontSize: "16px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    textDecoration: "none",
                    transition: "all 300ms ease",

                    /* Theme-based */
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,

                    /* обводка для dark */
                    border: `1px solid ${isDark
                            ? theme.palette.divider
                            : "transparent"
                        }`,

                    /* тени */
                    boxShadow: theme.shadows[1],

                    "&:hover": {
                        transform: "scale(1.05)",
                        backgroundColor: theme.palette.action.hover,
                        boxShadow: theme.shadows[3],
                    },

                    "&:active": {
                        transform: "scale(1)",
                        boxShadow: theme.shadows[0],
                    },

                    "&:hover .star-icon": {
                        color: theme.palette.warning.main,
                        transform: "scale(1.1) rotate(360deg)",
                        filter: `
                          drop-shadow(0 0 2px ${alpha(theme.palette.warning.main, 0.45)})
                          drop-shadow(0 0 4px ${alpha(theme.palette.warning.main, 0.25)})
                          drop-shadow(0 0 6px ${alpha(theme.palette.warning.main, 0.15)})
                        `
                    },

                    "&:hover .github-text": {
                        filter:
                            theme.palette.mode === "light"
                                ? "drop-shadow(0 0 4px rgba(0,0,0,0.3))"
                                : "none",
                    },
                }}
            >
                {/* GitHub иконка */}
                <GitHubIcon />

                {/* Текст */}
                <Box component="span" className="github-text">
                    Star on GitHub
                    {loading && " · …"}
                    {!loading && stars != null && ` · ${stars}`}
                </Box>

                {/* Иконка */}
                <Box
                    component="svg"
                    className="star-icon"
                    aria-hidden="true"
                    viewBox="0 0 47.94 47.94"
                    sx={{
                        width: 18,
                        height: 18,
                        mt: "-3px",
                        transition: "all 300ms ease",
                        fill: "currentColor",
                    }}
                >
                    <path d="M26.285,2.486l5.407,10.956c0.376,0.762,1.103,1.29,1.944,1.412l12.091,1.757
            c2.118,0.308,2.963,2.91,1.431,4.403l-8.749,8.528c-0.608,0.593-0.886,1.448-0.742,2.285l2.065,12.042
            c0.362,2.109-1.852,3.717-3.746,2.722l-10.814-5.685c-0.752-0.395-1.651-0.395-2.403,0l-10.814,5.685
            c-1.894,0.996-4.108-0.613-3.746-2.722l2.065-12.042c0.144-0.837-0.134-1.692-0.742-2.285l-8.749-8.528
            c-1.532-1.494-0.687-4.096,1.431-4.403l12.091-1.757c0.841-0.122,1.568-0.65,1.944-1.412l5.407-10.956
            C22.602,0.567,25.338,0.567,26.285,2.486z"
                    />
                </Box>
            </ButtonBase>
        </Tooltip>
    );
};

export default GitHubButton;
