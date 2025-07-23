package server

import (
	"strconv"
	"sync"

	"github.com/gofiber/websocket/v2"
	"github.com/sirupsen/logrus"
)

type Client struct {
	conn    *websocket.Conn
	channel string
}

type ClientSetting struct {
	Echo bool
}

var (
	rooms          = make(map[string]map[*Client]bool)
	roomsMutex     = &sync.Mutex{}
	clientSettings = make(map[*Client]ClientSetting)
)

func WsHandler(c *websocket.Conn) {
	channel := c.Query("channel")
	if channel == "" {
		channel = "default"
	}
	echo, _ := strconv.ParseBool(c.Query("echo"))

	client := &Client{
		conn:    c,
		channel: channel,
	}

	addClientToRoom(client, ClientSetting{Echo: echo})

	defer func() {
		removeClientFromRoom(client)
		_ = c.Close()
	}()

	logrus.Debugln("Websocket client join: ", channel)

	for {
		msgType, msg, err := c.ReadMessage()
		if err != nil {
			logrus.Debugln("Websocket link error or disconnect: ", err)
			break
		}

		broadcastToRoom(client.channel, msgType, msg, client)
	}
}

func addClientToRoom(client *Client, setting ClientSetting) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if _, exists := rooms[client.channel]; !exists {
		rooms[client.channel] = make(map[*Client]bool)
	}
	rooms[client.channel][client] = true
	clientSettings[client] = setting
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
		delete(clientSettings, client)
	}
}

func broadcastToRoom(channel string, msgType int, message []byte, sender *Client) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	for client := range rooms[channel] {
		var broadcastEcho bool
		if settings, ok := clientSettings[client]; ok {
			broadcastEcho = settings.Echo
		}

		// skip boardcast to sender when echo disabled.
		if !broadcastEcho && client == sender {
			continue
		}

		if err := client.conn.WriteMessage(msgType, message); err != nil {
			logrus.Errorln("Websocket send message failed: ", err)
			_ = client.conn.Close()
			delete(rooms[channel], client)
			delete(clientSettings, client)
		}
	}
}
