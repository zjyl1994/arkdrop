package startup

import (
	"os"
	"strconv"

	_ "github.com/joho/godotenv/autoload"
	"github.com/sirupsen/logrus"
	"github.com/zjyl1994/picotransfer/server"
	"github.com/zjyl1994/picotransfer/utils"
	"github.com/zjyl1994/picotransfer/vars"
)

func Start() (err error) {
	vars.DebugMode, _ = strconv.ParseBool(os.Getenv("PICOTRANSFER_DEBUG"))
	if vars.DebugMode {
		logrus.SetLevel(logrus.DebugLevel)
		logrus.Debugln("PicoTransfer in DEBUG mode.")
	}
	vars.ListenAddr = utils.COALESCE(os.Getenv("PICOTRANSFER_LISTEN"), ":10325")
	vars.Password = os.Getenv("PICOTRANSFER_PASSWORD")

	autoExpireDuration := utils.COALESCE(os.Getenv("PICOTRANSFER_AUTO_EXPIRE"), "7d")
	vars.AutoExpire, err = utils.ParseDuration(autoExpireDuration)
	if err != nil {
		return err
	}

	return server.Run(vars.ListenAddr)
}
