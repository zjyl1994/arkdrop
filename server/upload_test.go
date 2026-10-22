package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zjyl1994/arkdrop/service"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func uploadTestApp(t *testing.T) *fiber.App {
	t.Helper()
	oldDB, oldDir, oldExpiry := vars.DB, vars.DataDir, vars.AutoExpire
	vars.DataDir = t.TempDir()
	vars.AutoExpire = time.Hour
	if err := os.Mkdir(filepath.Join(vars.DataDir, "files"), 0755); err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(sqlite.Open(filepath.Join(vars.DataDir, "test.db")), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	vars.DB = db
	t.Cleanup(func() {
		_ = sqlDB.Close()
		vars.DB, vars.DataDir, vars.AutoExpire = oldDB, oldDir, oldExpiry
	})
	if err := db.AutoMigrate(&service.Parcel{}, &service.Attachment{}, &service.AttachmentShare{}); err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	app.Post("/api/create", CreateParcel)
	app.Post("/api/attachment", AddParcelAttachment)
	app.Get("/api/attachment/upload-status", AttachmentUploadStatus)
	app.Use("/files", FileCacheHeaders)
	app.Static("/files", filepath.Join(vars.DataDir, "files"), fiber.Static{ByteRange: true})
	return app
}

func sendTestRequest(t *testing.T, app *fiber.App, request *http.Request, wantStatus int, result any) {
	t.Helper()
	response, err := app.Test(request, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != wantStatus {
		t.Fatalf("status %d, want %d: %s", response.StatusCode, wantStatus, body)
	}
	if result != nil {
		if err := json.Unmarshal(body, result); err != nil {
			t.Fatal(err)
		}
	}
}

func testCreate(t *testing.T, app *fiber.App, key string) int {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/api/create", nil)
	request.Header.Set("X-Upload-Key", key)
	var result struct {
		ID int `json:"id"`
	}
	sendTestRequest(t, app, request, http.StatusOK, &result)
	return result.ID
}

func testAttachmentRequest(t *testing.T, id int, key string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "hello.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("hello world")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/attachment?id=%d", id), &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	request.Header.Set("X-Upload-Key", key)
	return request
}

func TestUploadRetryDoesNotDuplicateRecordOrFile(t *testing.T) {
	app := uploadTestApp(t)
	id := testCreate(t, app, "parcel-key-0123456789")
	if retryID := testCreate(t, app, "parcel-key-0123456789"); retryID != id {
		t.Fatalf("retry parcel = %d, want %d", retryID, id)
	}
	var first, retry struct {
		Attachments []service.Attachment `json:"attachments"`
		ExpiresAt   int64                `json:"expires_at"`
	}
	sendTestRequest(t, app, testAttachmentRequest(t, id, "file-key-01234567890"), http.StatusOK, &first)
	sendTestRequest(t, app, testAttachmentRequest(t, id, "file-key-01234567890"), http.StatusOK, &retry)
	if len(first.Attachments) != 1 || len(retry.Attachments) != 1 || first.Attachments[0].ID != retry.Attachments[0].ID {
		t.Fatalf("duplicate retry response: %+v / %+v", first, retry)
	}
	request := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/attachment/upload-status?id=%d", id), nil)
	request.Header.Set("X-Upload-Key", "file-key-01234567890")
	sendTestRequest(t, app, request, http.StatusOK, &retry)
	if retry.Attachments[0].ID != first.Attachments[0].ID {
		t.Fatal("status failed to confirm completed file")
	}
	files, err := os.ReadDir(filepath.Join(vars.DataDir, "files"))
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 1 {
		t.Fatalf("disk file count = %d, want 1", len(files))
	}
	var count int64
	if err := vars.DB.Model(&service.Attachment{}).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("attachment count = %d, want 1", count)
	}
	if first.ExpiresAt <= time.Now().Unix() {
		t.Fatal("missing image-cache lifetime")
	}
	if err := parcelService.Delete(id); err != nil {
		t.Fatal(err)
	}
	files, err = os.ReadDir(filepath.Join(vars.DataDir, "files"))
	if err != nil || len(files) != 0 {
		t.Fatalf("delete left files: %v, %v", files, err)
	}
}

func TestLegacyUploadsWithoutKeyStillAllowMultipleFiles(t *testing.T) {
	app := uploadTestApp(t)
	id := testCreate(t, app, "")
	if other := testCreate(t, app, ""); other == id {
		t.Fatal("legacy creates were incorrectly deduplicated")
	}
	for range 2 {
		sendTestRequest(t, app, testAttachmentRequest(t, id, ""), http.StatusOK, nil)
	}
	var count int64
	if err := vars.DB.Model(&service.Attachment{}).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 2 {
		t.Fatalf("legacy attachment count = %d", count)
	}
}

func TestExpiredParcelRejectsUploadsAndCachedFileRequests(t *testing.T) {
	app := uploadTestApp(t)
	id := testCreate(t, app, "parcel-key-0123456789")
	var result struct {
		Attachments []service.Attachment `json:"attachments"`
	}
	sendTestRequest(t, app, testAttachmentRequest(t, id, "file-key-01234567890"), http.StatusOK, &result)
	url := "/files/" + result.Attachments[0].FilePath
	response, err := app.Test(httptest.NewRequest(http.MethodGet, url, nil), -1)
	if err != nil {
		t.Fatal(err)
	}
	_ = response.Body.Close()
	if response.StatusCode != http.StatusOK || response.Header.Get("X-ArkDrop-Expires-At") == "" {
		t.Fatal("file response lacks bounded cache expiry")
	}
	if err := vars.DB.Model(&service.Parcel{}).Where("id = ?", id).Update("created_at", time.Now().Add(-2*time.Hour).Unix()).Error; err != nil {
		t.Fatal(err)
	}
	sendTestRequest(t, app, testAttachmentRequest(t, id, "other-key-0123456789"), http.StatusGone, nil)
	sendTestRequest(t, app, httptest.NewRequest(http.MethodGet, url, nil), http.StatusGone, nil)
}

func TestInvalidUploadKeyIsRejected(t *testing.T) {
	app := uploadTestApp(t)
	request := httptest.NewRequest(http.MethodPost, "/api/create", nil)
	request.Header.Set("X-Upload-Key", "bad")
	sendTestRequest(t, app, request, http.StatusBadRequest, nil)
}

func TestAttachmentUniqueKeyReusesCommittedFile(t *testing.T) {
	app := uploadTestApp(t)
	id := testCreate(t, app, "parcel-key-0123456789")
	key := "file-key-01234567890"
	first, reused, err := parcelService.AddAttachmentOnce(id, service.Attachment{UploadKey: &key, FilePath: "first"})
	if err != nil || reused {
		t.Fatalf("first upload: reused=%v, err=%v", reused, err)
	}
	second, reused, err := parcelService.AddAttachmentOnce(id, service.Attachment{UploadKey: &key, FilePath: "retry"})
	if err != nil || !reused {
		t.Fatalf("retry upload: reused=%v, err=%v", reused, err)
	}
	if second.ID != first.ID || second.FilePath != "first" {
		t.Fatalf("retry changed stored file: %+v", second)
	}
	otherID := testCreate(t, app, "other-parcel-key-012345")
	other, reused, err := parcelService.AddAttachmentOnce(otherID, service.Attachment{UploadKey: &key, FilePath: "other-parcel"})
	if err != nil || reused || other.ID == first.ID {
		t.Fatalf("key should be scoped to parcel: %+v, %v, %v", other, reused, err)
	}
}
