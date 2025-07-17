package utils

import (
	"math/rand/v2"
	"strings"
)

func COALESCE[T comparable](elem ...T) T {
	var empty T
	for _, item := range elem {
		if item != empty {
			return item
		}
	}
	return empty
}

func RandString(n int) string {
	const charsets = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	var sb strings.Builder
	for range n {
		sb.WriteByte(charsets[rand.IntN(len(charsets))])
	}
	return sb.String()
}
