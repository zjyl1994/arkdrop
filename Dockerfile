FROM golang:alpine AS builder
RUN --mount=type=cache,target=/var/cache/apk apk add git ca-certificates gcc g++ make pnpm
WORKDIR /code
COPY . .
ARG GOPROXY=https://proxy.golang.org,direct
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/pnpm_cache make

FROM alpine:latest AS prod
RUN --mount=type=cache,target=/var/cache/apk apk add ca-certificates
WORKDIR /app
VOLUME /app/data
ENV ARKDROP_DATA_DIR=/app/data
COPY --from=builder /code/arkdrop .
CMD ["./arkdrop"]
