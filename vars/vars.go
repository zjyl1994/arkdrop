package vars

import (
	"time"

	"github.com/zjyl1994/cap-go"
	"gorm.io/gorm"
)

var (
	ListenAddr string
	DataDir    string
	DebugMode  bool
	Password   string
	AutoExpire time.Duration

	DB          *gorm.DB
	CapInstance cap.ICap
)

const (
	JWT_TOKEN_EXPIRE     = 24 * 30 * time.Hour
	AUTO_EXPIRE_INTERVAL = time.Hour
)
