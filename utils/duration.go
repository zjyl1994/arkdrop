package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var durationRE = regexp.MustCompile(`(\d+)\s*(ns|us|µs|ms|s|m|h|d|w|M)`)

type unitMap map[string]time.Duration

var units = unitMap{
	"ns": time.Nanosecond,
	"us": time.Microsecond,
	"µs": time.Microsecond,
	"ms": time.Millisecond,
	"s":  time.Second,
	"m":  time.Minute,
	"h":  time.Hour,
	"d":  24 * time.Hour,
	"w":  7 * 24 * time.Hour,
	"M":  30 * 24 * time.Hour, // 注意：这里假设一个月为30天
}

func ParseDuration(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)
	var dur time.Duration
	matches := durationRE.FindAllStringSubmatch(s, -1)
	if len(matches) == 0 {
		return 0, fmt.Errorf("invalid duration %q", s)
	}
	for _, m := range matches {
		val, err := strconv.Atoi(m[1])
		if err != nil {
			return 0, err
		}
		unit, ok := units[m[2]]
		if !ok {
			return 0, fmt.Errorf("unknown unit %q in duration %q", m[2], s)
		}
		dur += time.Duration(val) * unit
	}
	return dur, nil
}
