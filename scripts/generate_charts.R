suppressPackageStartupMessages({
  library(ggplot2)
  library(gridExtra)
})

dir.create("assets/charts", showWarnings = FALSE, recursive = TRUE)

theme_siph_senior <- function() {
  theme_minimal(base_family = "Helvetica") +
    theme(
      plot.title = element_text(size = 15, face = "bold", color = "#0F172A", margin = margin(b = 6)),
      plot.subtitle = element_text(size = 11.5, color = "#475569", margin = margin(b = 12)),
      axis.text.x = element_text(size = 12, face = "bold", color = "#1E293B"),
      axis.text.y = element_text(size = 11, face = "bold", color = "#475569"),
      axis.title.y = element_text(size = 11.5, face = "bold", color = "#334155", margin = margin(r = 8)),
      axis.title.x = element_blank(),
      panel.grid.major.x = element_blank(),
      panel.grid.minor = element_blank(),
      panel.grid.major.y = element_line(color = "#E2E8F0", linewidth = 0.9),
      plot.background = element_rect(fill = "#FFFFFF", color = NA),
      panel.background = element_rect(fill = "#FFFFFF", color = NA),
      legend.position = "none",
      plot.margin = margin(12, 16, 12, 12)
    )
}

# ==========================================
# SLIDE 2: OVERVIEW 2026 (JANUARI - OKTOBER)
# ==========================================
df2 <- data.frame(
  bulan = factor(c("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt"),
                 levels = c("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt")),
  iph = c(-0.22, -1.48, 0.82, 1.62, -0.50, -0.58, -1.75, -0.51, 1.05, 0.84)
)

p2 <- ggplot(df2, aes(x = bulan, y = iph, group = 1)) +
  geom_hline(yintercept = 0, color = "#64748B", linetype = "dashed", linewidth = 0.8) +
  geom_line(color = "#0284C7", linewidth = 1.8) +
  geom_point(aes(color = iph > 0), size = 5.2) +
  scale_color_manual(values = c("TRUE" = "#0284C7", "FALSE" = "#16A34A")) +
  geom_text(aes(label = sprintf("%+.2f%%", iph),
                vjust = ifelse(iph >= 0, -1.3, 1.8)),
            size = 4.4, fontface = "bold", color = "#0F172A") +
  scale_y_continuous(limits = c(-2.7, 2.7), breaks = seq(-2, 2, 1)) +
  labs(
    title = "Rata-rata IPH Bulanan Kab. Kepulauan Selayar 2026",
    subtitle = "Garis putus-putus = Titik Stabil 0%. Titik Hijau = Deflasi, Titik Biru = Inflasi",
    y = "Nilai IPH (%)"
  ) +
  theme_siph_senior()

ggsave("assets/charts/chart_slide2.png", plot = p2, width = 6.8, height = 4.8, dpi = 300)

# ==========================================
# SLIDE 3: MARET - APRIL 2026 (HBKN IDUL FITRI)
# ==========================================
df3_w <- data.frame(
  minggu = factor(c("Mar W1", "Mar W2", "Apr W1", "Apr W2", "Apr W4", "Apr W5"),
                  levels = c("Mar W1", "Mar W2", "Apr W1", "Apr W2", "Apr W4", "Apr W5")),
  iph = c(0.37, 1.28, 3.26, -3.29, 3.29, 3.23)
)

df3_c <- data.frame(
  komoditas = factor(c("Daging Ayam", "Telur Ayam", "Daging Sapi"),
                     levels = c("Daging Ayam", "Telur Ayam", "Daging Sapi")),
  andil = c(0.92, 1.35, 2.17)
)

p3a <- ggplot(df3_w, aes(x = minggu, y = iph, fill = iph > 0)) +
  geom_hline(yintercept = 0, color = "#64748B", linetype = "dashed", linewidth = 0.7) +
  geom_col(width = 0.55, alpha = 0.95) +
  scale_fill_manual(values = c("TRUE" = "#DC2626", "FALSE" = "#16A34A")) +
  geom_text(aes(label = sprintf("%+.2f%%", iph),
                vjust = ifelse(iph >= 0, -0.4, 1.3)),
            size = 3.8, fontface = "bold", color = "#0F172A") +
  scale_y_continuous(limits = c(-4.2, 4.4)) +
  labs(title = "Fluktuasi Mingguan Fase Ramadan & Idul Fitri", y = "IPH (%)") +
  theme_siph_senior() +
  theme(plot.title = element_text(size = 12.5, face = "bold"))

p3b <- ggplot(df3_c, aes(x = andil, y = komoditas)) +
  geom_col(fill = "#DC2626", width = 0.5, alpha = 0.95) +
  geom_text(aes(label = sprintf("+%.2f%%", andil)), hjust = -0.2, size = 4.0, fontface = "bold", color = "#991B1B") +
  scale_x_continuous(limits = c(0, 2.7)) +
  labs(title = "Andil Maksimal Komoditas Pemicu HBKN", x = "Andil Inflasi (% Max)", y = NULL) +
  theme_siph_senior() +
  theme(
    plot.title = element_text(size = 12.5, face = "bold"),
    axis.title.x = element_text(size = 11, face = "bold", color = "#475569"),
    axis.text.y = element_text(size = 11.5, face = "bold", color = "#1E293B"),
    panel.grid.major.y = element_blank(),
    panel.grid.major.x = element_line(color = "#E2E8F0", linewidth = 0.9)
  )

p3 <- grid.arrange(p3a, p3b, ncol = 1,
                   top = grid::textGrob("Dinamika Harga HBKN Idul Fitri (Maret - April 2026)",
                                        gp = grid::gpar(fontsize = 14, fontface = "bold", col = "#0F172A")))
ggsave("assets/charts/chart_slide3.png", plot = p3, width = 6.8, height = 4.8, dpi = 300)

# ==========================================
# SLIDE 4: MEI - JULI 2026 (FASE DEFLASI)
# ==========================================
df4_w <- data.frame(
  minggu = factor(c("Jul W1", "Jul W2", "Jul W3", "Jul W4", "Jul W5"),
                  levels = c("Jul W1", "Jul W2", "Jul W3", "Jul W4", "Jul W5")),
  iph = c(-1.31, -1.62, -1.82, -1.97, -2.02)
)

df4_c <- data.frame(
  komoditas = factor(c("Bawang Merah", "Daging Ayam", "Cabai Rawit"),
                     levels = c("Bawang Merah", "Daging Ayam", "Cabai Rawit")),
  andil = c(-0.42, -0.61, -0.64)
)

p4a <- ggplot(df4_w, aes(x = minggu, y = iph)) +
  geom_col(fill = "#16A34A", width = 0.55, alpha = 0.95) +
  geom_text(aes(label = sprintf("%.2f%%", iph)), vjust = 1.3, size = 4.0, fontface = "bold", color = "#14532D") +
  scale_y_continuous(limits = c(-2.6, 0)) +
  labs(title = "Trajektori Deflasi Mingguan Juli 2026", y = "IPH (%)") +
  theme_siph_senior() +
  theme(plot.title = element_text(size = 12.5, face = "bold"))

p4b <- ggplot(df4_c, aes(x = andil, y = komoditas)) +
  geom_col(fill = "#15803D", width = 0.5, alpha = 0.95) +
  geom_text(aes(label = sprintf("%.2f%%", andil)), hjust = 1.2, size = 4.0, fontface = "bold", color = "#14532D") +
  scale_x_continuous(limits = c(-0.85, 0)) +
  labs(title = "Komoditas Pendorong Deflasi Terbesar", x = "Andil Deflasi (%)", y = NULL) +
  theme_siph_senior() +
  theme(
    plot.title = element_text(size = 12.5, face = "bold"),
    axis.title.x = element_text(size = 11, face = "bold", color = "#475569"),
    axis.text.y = element_text(size = 11.5, face = "bold", color = "#1E293B"),
    panel.grid.major.y = element_blank(),
    panel.grid.major.x = element_line(color = "#E2E8F0", linewidth = 0.9)
  )

p4 <- grid.arrange(p4a, p4b, ncol = 1,
                   top = grid::textGrob("Fase Deflasi Pasca Panen Raya (Juli 2026)",
                                        gp = grid::gpar(fontsize = 14, fontface = "bold", col = "#0F172A")))
ggsave("assets/charts/chart_slide4.png", plot = p4, width = 6.8, height = 4.8, dpi = 300)

# ==========================================
# SLIDE 5: SEPTEMBER - OKTOBER 2026 (REBOUND)
# ==========================================
df5_w <- data.frame(
  minggu = factor(c("Sep W1", "Sep W2", "Sep W3", "Sep W4", "Okt W1"),
                  levels = c("Sep W1", "Sep W2", "Sep W3", "Sep W4", "Okt W1")),
  iph = c(0.39, 0.95, 1.29, 1.57, 0.84)
)

df5_c <- data.frame(
  komoditas = factor(c("Beras", "Cabai Merah", "Cabai Rawit"),
                     levels = c("Beras", "Cabai Merah", "Cabai Rawit")),
  andil = c(0.53, 0.62, 1.13)
)

p5a <- ggplot(df5_w, aes(x = minggu, y = iph, group = 1)) +
  geom_line(color = "#D97706", linewidth = 1.8) +
  geom_point(color = "#D97706", size = 5.0) +
  geom_text(aes(label = sprintf("+%.2f%%", iph)), vjust = -1.2, size = 4.0, fontface = "bold", color = "#B45309") +
  scale_y_continuous(limits = c(0.1, 2.0)) +
  labs(title = "Rebound IPH Mingguan September - Oktober 2026", y = "IPH (%)") +
  theme_siph_senior() +
  theme(plot.title = element_text(size = 12.5, face = "bold"))

p5b <- ggplot(df5_c, aes(x = andil, y = komoditas)) +
  geom_col(fill = "#EA580C", width = 0.5, alpha = 0.95) +
  geom_text(aes(label = sprintf("+%.2f%%", andil)), hjust = -0.2, size = 4.0, fontface = "bold", color = "#9A3412") +
  scale_x_continuous(limits = c(0, 1.45)) +
  labs(title = "Komoditas Pendorong Kenaikan Akhir Q3", x = "Andil Inflasi (%)", y = NULL) +
  theme_siph_senior() +
  theme(
    plot.title = element_text(size = 12.5, face = "bold"),
    axis.title.x = element_text(size = 11, face = "bold", color = "#475569"),
    axis.text.y = element_text(size = 11.5, face = "bold", color = "#1E293B"),
    panel.grid.major.y = element_blank(),
    panel.grid.major.x = element_line(color = "#E2E8F0", linewidth = 0.9)
  )

p5 <- grid.arrange(p5a, p5b, ncol = 1,
                   top = grid::textGrob("Peningkatan Harga Musim Peralihan (Sep - Okt 2026)",
                                        gp = grid::gpar(fontsize = 14, fontface = "bold", col = "#0F172A")))
ggsave("assets/charts/chart_slide5.png", plot = p5, width = 6.8, height = 4.8, dpi = 300)

# ==========================================
# SLIDE 6: FREKUENSI GEJOLAK KOMODITAS 2026
# ==========================================
df6 <- data.frame(
  komoditas = factor(c("Daging Ayam", "Cabai Merah", "Beras", "Telur Ayam", "Cabai Rawit"),
                     levels = c("Daging Ayam", "Cabai Merah", "Beras", "Telur Ayam", "Cabai Rawit")),
  frekuensi = c(3, 4, 4, 5, 15)
)

p6 <- ggplot(df6, aes(x = frekuensi, y = komoditas)) +
  geom_col(fill = "#0284C7", width = 0.55, alpha = 0.95) +
  geom_text(aes(label = paste0(frekuensi, " kali")), hjust = -0.15, size = 4.3, fontface = "bold", color = "#0369A1") +
  scale_x_continuous(limits = c(0, 19)) +
  labs(
    title = "Frekuensi Komoditas Pemicu Gejolak Utama (2026)",
    subtitle = "Jumlah minggu tercatat sebagai fluktuasi harga tertinggi di Kepulauan Selayar",
    x = "Frekuensi Kejadian (Minggu)",
    y = NULL
  ) +
  theme_siph_senior() +
  theme(
    axis.title.x = element_text(size = 11.5, face = "bold", color = "#475569"),
    axis.text.y = element_text(size = 12, face = "bold", color = "#1E293B"),
    panel.grid.major.y = element_blank(),
    panel.grid.major.x = element_line(color = "#E2E8F0", linewidth = 0.9)
  )

ggsave("assets/charts/chart_slide6.png", plot = p6, width = 6.8, height = 4.8, dpi = 300)

cat("All 2026 senior-friendly charts successfully regenerated!\n")
