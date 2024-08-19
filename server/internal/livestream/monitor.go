package livestream

import (
	"encoding/gob"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/marcopeocchi/yt-dlp-web-ui/server/config"
)

type Monitor struct {
	streams map[string]*LiveStream // keeps track of the livestreams
	done    chan *LiveStream       // to signal individual processes completition
	logs    chan []byte            // to signal individual processes completition
}

func NewMonitor() *Monitor {
	return &Monitor{
		streams: make(map[string]*LiveStream),
		done:    make(chan *LiveStream),
	}
}

// Detect each livestream completition, if done remove it from the monitor.
func (m *Monitor) Schedule() {
	for l := range m.done {
		delete(m.streams, l.url)
	}
}

func (m *Monitor) Add(url string) {
	ls := New(url, m.logs, m.done)

	go ls.Start()
	m.streams[url] = ls
}

func (m *Monitor) Remove(url string) error {
	return m.streams[url].Kill()
}

func (m *Monitor) RemoveAll() error {
	for _, v := range m.streams {
		if err := v.Kill(); err != nil {
			return err
		}
	}
	return nil
}

func (m *Monitor) Status() LiveStreamStatus {
	status := make(LiveStreamStatus)

	for k, v := range m.streams {
		// wt, ok := <-v.WaitTime()
		// if !ok {
		// 	continue
		// }

		status[k] = struct {
			Status   int
			WaitTime time.Duration
			LiveDate time.Time
		}{
			Status:   v.status,
			WaitTime: v.waitTime,
			LiveDate: v.liveDate,
		}
	}

	return status
}

// Persist the monitor current state to a file.
// The file is located in the configured config directory
func (m *Monitor) Persist() error {
	fd, err := os.Create(filepath.Join(config.Instance().Dir(), "livestreams.dat"))
	if err != nil {
		return err
	}

	defer fd.Close()

	slog.Debug("persisting livestream monitor state")

	return gob.NewEncoder(fd).Encode(m.streams)
}

// Restore a saved state and resume the monitored livestreams
func (m *Monitor) Restore() error {
	fd, err := os.Open(filepath.Join(config.Instance().Dir(), "livestreams.dat"))
	if err != nil {
		return err
	}

	defer fd.Close()

	restored := make(map[string]*LiveStream)

	if err := gob.NewDecoder(fd).Decode(&restored); err != nil {
		return err
	}

	for k := range restored {
		m.Add(k)
	}

	slog.Debug("restored livestream monitor state")

	return nil
}

// Return a fan-in logs channel
func (m *Monitor) Logs() <-chan []byte {
	return m.logs
}
