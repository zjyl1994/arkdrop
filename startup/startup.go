package startup

import (
	"os"
	"path/filepath"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"
	gorm_logrus "github.com/onrik/gorm-logrus"
	"github.com/sirupsen/logrus"
	"github.com/zjyl1994/arkdrop/server"
	"github.com/zjyl1994/arkdrop/service"
	"github.com/zjyl1994/arkdrop/utils"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func Start() (err error) {
	vars.DebugMode, _ = strconv.ParseBool(os.Getenv("ARKDROP_DEBUG"))
	if vars.DebugMode {
		logrus.SetLevel(logrus.DebugLevel)
		logrus.Debugln("PicoTransfer in DEBUG mode.")
	}
	vars.ListenAddr = utils.COALESCE(os.Getenv("ARKDROP_LISTEN"), ":10325")
	vars.DataDir = os.Getenv("ARKDROP_DATA_DIR")
	err = os.MkdirAll(filepath.Join(vars.DataDir, "files"), 0755)
	if err != nil {
		return err
	}
	vars.Password = os.Getenv("ARKDROP_PASSWORD")

	autoExpireDuration := utils.COALESCE(os.Getenv("ARKDROP_AUTO_EXPIRE"), "1w")
	vars.AutoExpire, err = utils.ParseDuration(autoExpireDuration)
	if err != nil {
		return err
	}

	dbFile := filepath.Join(vars.DataDir, "arkdrop.db")
	vars.DB, err = gorm.Open(sqlite.Open(dbFile), &gorm.Config{
		Logger: gorm_logrus.New(),
	})
	if err != nil {
		return err
	}
	err = vars.DB.Exec("PRAGMA journal_mode=WAL;").Error
	if err != nil {
		return err
	}

	err = vars.DB.AutoMigrate(&service.Parcel{}, &service.Attachment{})
	if err != nil {
		return err
	}
	go func() {
		doClean := func() {
			var service service.ParcelService
			err := service.CleanExpired()
			if err != nil {
				logrus.Errorln("Clean expired parcels failed:", err)
			}
		}

		doClean()

		ticker := time.Tick(vars.AUTO_EXPIRE_INTERVAL)
		for range ticker {
			doClean()
		}
	}()
	return server.Run(vars.ListenAddr)
}
