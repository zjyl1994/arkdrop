package server

import (
	"sync"

	"github.com/gofiber/websocket/v2"
	"github.com/sirupsen/logrus"
)

type Client struct {
	conn    *websocket.Conn
	channel string
}

var (
	rooms      = make(map[string]map[*Client]bool)
	roomsMutex = &sync.Mutex{}
)

func WsHandler(c *websocket.Conn) {
	channel := c.Query("channel")
	if channel == "" {
		channel = "default"
	}

	client := &Client{
		conn:    c,
		channel: channel,
	}

	addClientToRoom(client)

	defer func() {
		// 客户端断开连接时移除
		removeClientFromRoom(client)
		_ = c.Close()
	}()

	logrus.Debugln("客户端加入频道: ", channel)

	for {
		msgType, msg, err := c.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err) {
				logrus.Debugln("连接断开: ", err)
			} else {
				logrus.Errorln("连接出错: ", err)
			}
			break
		}

		broadcastToRoom(client.channel, msgType, msg, client)
	}
}

func addClientToRoom(client *Client) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if _, exists := rooms[client.channel]; !exists {
		rooms[client.channel] = make(map[*Client]bool)
	}
	rooms[client.channel][client] = true
}

func removeClientFromRoom(client *Client) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if clients, exists := rooms[client.channel]; exists {
		if _, found := clients[client]; found {
			delete(clients, client)
			if len(clients) == 0 {
				delete(rooms, client.channel)
			}
		}
	}
}

func broadcastToRoom(channel string, msgType int, message []byte, sender *Client) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	for client := range rooms[channel] {
		if client == sender {
			continue
		}
		if err := client.conn.WriteMessage(msgType, message); err != nil {
			logrus.Errorln("发送消息失败: ", err)
			_ = client.conn.Close()
			delete(rooms[channel], client)
		}
	}
}
