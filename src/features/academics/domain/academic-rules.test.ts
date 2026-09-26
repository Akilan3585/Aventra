import { describe, expect, it } from "vitest";

import {
  courseMaterialFileIsAllowed,
  courseMaterialHasBody,
  courseMaterialMaxFileBytes,
  courseMaterialMediaKind,
  courseMaterialStoragePath,
  courseMaterialStoragePathIsValid,
  courseMaterialUrlIsValid,
  materialFolderNameIsValid,
} from "./academic-rules";

describe("course material rules", () => {
  it("requires written content, a resource link, or an uploaded document", () => {
    expect(courseMaterialHasBody({ content: "Chapter 3 summary", hasFile: false, resourceUrl: "" })).toBe(true);
    expect(courseMaterialHasBody({ content: "", hasFile: false, resourceUrl: "https://example.edu/notes.pdf" })).toBe(true);
    expect(courseMaterialHasBody({ content: "", hasFile: true, resourceUrl: "" })).toBe(true);
    expect(courseMaterialHasBody({ content: "   ", hasFile: false, resourceUrl: "" })).toBe(false);
  });

  it("accepts only http(s) resource links", () => {
    expect(courseMaterialUrlIsValid("")).toBe(true);
    expect(courseMaterialUrlIsValid("https://example.edu/slides")).toBe(true);
    expect(courseMaterialUrlIsValid("http://example.edu/slides")).toBe(true);
    expect(courseMaterialUrlIsValid("javascript:alert(1)")).toBe(false);
    expect(courseMaterialUrlIsValid("notes.pdf")).toBe(false);
  });

  it("accepts common document types within the size limit", () => {
    expect(courseMaterialFileIsAllowed({ name: "unit-a.pdf", size: 1024 })).toBe(true);
    expect(courseMaterialFileIsAllowed({ name: "slides.PPTX", size: 1024 })).toBe(true);
    expect(courseMaterialFileIsAllowed({ name: "script.exe", size: 1024 })).toBe(false);
    expect(courseMaterialFileIsAllowed({ name: "empty.pdf", size: 0 })).toBe(false);
    expect(courseMaterialFileIsAllowed({ name: "huge.pdf", size: courseMaterialMaxFileBytes + 1 })).toBe(false);
  });

  it("keeps folder names short and free of path separators", () => {
    expect(materialFolderNameIsValid("Unit A")).toBe(true);
    expect(materialFolderNameIsValid("A")).toBe(false);
    expect(materialFolderNameIsValid("Unit/A")).toBe(false);
    expect(materialFolderNameIsValid("x".repeat(81))).toBe(false);
  });
});

describe("course material media", () => {
  const offeringId = "50000000-0000-0000-0000-000000000001";
  const folderId = "4c9b6a12-1dc8-4f35-8a70-f21a76739491";
  const uploadId = "0f3d2c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

  it("accepts video and audio files for direct upload", () => {
    expect(courseMaterialFileIsAllowed({ name: "lecture-1.mp4", size: 40 * 1024 * 1024 })).toBe(true);
    expect(courseMaterialFileIsAllowed({ name: "lecture-1.mp4", size: 120 * 1024 * 1024 })).toBe(false);
    expect(courseMaterialFileIsAllowed({ name: "podcast.mp3", size: 5 * 1024 * 1024 })).toBe(true);
    expect(courseMaterialFileIsAllowed({ name: "tool.exe", size: 1024 })).toBe(false);
  });

  it("classifies media by mime type first and extension second", () => {
    expect(courseMaterialMediaKind("lecture.mp4", "video/mp4")).toBe("video");
    expect(courseMaterialMediaKind("lecture.mov", null)).toBe("video");
    expect(courseMaterialMediaKind("talk.m4a", "")).toBe("audio");
    expect(courseMaterialMediaKind("diagram.png", "image/png")).toBe("image");
    expect(courseMaterialMediaKind("notes.pdf", "application/pdf")).toBe("file");
    expect(courseMaterialMediaKind(null, null)).toBe("file");
  });

  it("mints and verifies scoped storage paths", () => {
    const path = courseMaterialStoragePath({ fileName: "Lecture 1.MP4", folderId, offeringId, uploadId });
    expect(path).toBe(`${offeringId}/${folderId}/${uploadId}.mp4`);
    expect(courseMaterialStoragePathIsValid(path, { folderId, offeringId })).toBe(true);
    expect(courseMaterialStoragePathIsValid(path, { folderId: offeringId, offeringId })).toBe(false);
    expect(courseMaterialStoragePathIsValid(`${offeringId}/${folderId}/../secret.pdf`, { folderId, offeringId })).toBe(false);
    expect(courseMaterialStoragePathIsValid(`${offeringId}/${folderId}/${uploadId}.exe`, { folderId, offeringId })).toBe(false);
  });
});
