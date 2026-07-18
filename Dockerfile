# Dockerfile — village-pulse
#
# Two-stage build:
#   1. go-builder  — templ generate + tailwindcss + go build
#   2. runtime     — minimal alpine, non-root user, /data volume
#
# Usage:
#   docker build -t ghcr.io/mkucharz/village-pulse:latest .

FROM golang:1.25-alpine AS go-builder

RUN apk add --no-cache curl git ca-certificates tzdata

# Install templ
RUN go install github.com/a-h/templ/cmd/templ@latest

# Install Tailwind standalone CLI
RUN curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/download/v4.3.2/tailwindcss-linux-x64 && \
    mv tailwindcss-linux-x64 /usr/local/bin/tailwindcss && \
    chmod +x /usr/local/bin/tailwindcss

WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/root/go/pkg/mod \
    go mod download

COPY . .

# Generate Templ code and compile CSS
RUN templ generate
RUN tailwindcss -i assets/input.css -o static/output.css --minify

# Build static binary
RUN --mount=type=cache,target=/root/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
      -ldflags="-s -w" \
      -o /out/village-pulse \
      ./cmd/village-pulse

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata wget

RUN addgroup -S village && adduser -S village -G village

COPY --from=go-builder /out/village-pulse /usr/local/bin/village-pulse
COPY --from=go-builder /src/static /static

RUN mkdir -p /data && chown village:village /data

VOLUME ["/data"]

EXPOSE 9080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:9080/health || exit 1

USER village

ENV VILLAGE_CONFIG=/data/village.yaml

ENTRYPOINT ["village-pulse"]
CMD ["serve"]
