package vars

import "time"

var (
	ListenAddr string
	DebugMode  bool
	Password   string
	AutoExpire time.Duration
)

const (
	TOKEN_EXPIRE = 24 * 30 * time.Hour
)
