package startup

import (
	"os"
	"path/filepath"
	"strconv"

	_ "github.com/joho/godotenv/autoload"
	gorm_logrus "github.com/onrik/gorm-logrus"
	"github.com/sirupsen/logrus"
	"github.com/zjyl1994/picotransfer/server"
	"github.com/zjyl1994/picotransfer/service"
	"github.com/zjyl1994/picotransfer/utils"
	"github.com/zjyl1994/picotransfer/vars"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func Start() (err error) {
	vars.DebugMode, _ = strconv.ParseBool(os.Getenv("PICOTRANSFER_DEBUG"))
	if vars.DebugMode {
		logrus.SetLevel(logrus.DebugLevel)
		logrus.Debugln("PicoTransfer in DEBUG mode.")
	}
	vars.ListenAddr = utils.COALESCE(os.Getenv("PICOTRANSFER_LISTEN"), ":10325")
	vars.DataDir = os.Getenv("PICOTRANSFER_DATA_DIR")
	err = os.MkdirAll(filepath.Join(vars.DataDir, "files"), 0755)
	if err != nil {
		return err
	}
	vars.Password = os.Getenv("PICOTRANSFER_PASSWORD")

	autoExpireDuration := utils.COALESCE(os.Getenv("PICOTRANSFER_AUTO_EXPIRE"), "1w")
	vars.AutoExpire, err = utils.ParseDuration(autoExpireDuration)
	if err != nil {
		return err
	}

	dbFile := filepath.Join(vars.DataDir, "picotransfer.db")
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

	return server.Run(vars.ListenAddr)
}
