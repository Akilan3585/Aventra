import {
  calculateAttendanceRate,
  isAttendanceStatus,
} from "../../attendance/domain/attendance-rules";

export type RiskLevel = "high" | "medium" | "low" | "insufficient-data";

export type StudentSuccessSignals = {
  academicAverage: number | null;
  attendanceRate: number | null;
  latestCgpa: number | null;
  reasons: string[];
  riskLevel: RiskLevel;
  riskScore: number | null;
};


type StudentSignalInput = {
  attendanceStatuses: string[];
  internalMarks: Array<{ marksObtained: number; maximumMarks: number }>;
  latestCgpa: number | null;
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function calculateStudentSuccessSignals({
  attendanceStatuses,
  internalMarks,
  latestCgpa,
}: StudentSignalInput): StudentSuccessSignals {
  const attendanceRate = calculateAttendanceRate(attendanceStatuses.filter(isAttendanceStatus));

  const earnedMarks = internalMarks.reduce(
    (sum, mark) => sum + Number(mark.marksObtained),
    0,
  );
  const maximumMarks = internalMarks.reduce(
    (sum, mark) => sum + Number(mark.maximumMarks),
    0,
  );
  const academicAverage = maximumMarks > 0
    ? round((earnedMarks / maximumMarks) * 100)
    : null;

  const evidenceCount = [attendanceRate, academicAverage, latestCgpa].filter(
    (value) => value !== null,
  ).length;
  if (evidenceCount === 0) {
    return {
      academicAverage,
      attendanceRate,
      latestCgpa,
      reasons: ["Awaiting attendance or assessment data"],
      riskLevel: "insufficient-data",
      riskScore: null,
    };
  }

  const attendanceRisk = attendanceRate === null
    ? 0
    : Math.max(0, Math.min(100, (80 - attendanceRate) * 4));
  const academicRisk = academicAverage === null
    ? 0
    : Math.max(0, Math.min(100, (65 - academicAverage) * 2.5));
  const cgpaRisk = latestCgpa === null
    ? 0
    : Math.max(0, Math.min(100, (7 - latestCgpa) * 20));
  const weightedSignals = [
    attendanceRate === null ? null : { score: attendanceRisk, weight: 0.45 },
    academicAverage === null ? null : { score: academicRisk, weight: 0.35 },
    latestCgpa === null ? null : { score: cgpaRisk, weight: 0.2 },
  ].filter((signal): signal is { score: number; weight: number } => signal !== null);
  const totalWeight = weightedSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const riskScore = round(
    weightedSignals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) /
      totalWeight,
  );
  const reasons: string[] = [];

  if (attendanceRate !== null && attendanceRate < 75) {
    reasons.push(`Attendance is ${attendanceRate}%`);
  }
  if (academicAverage !== null && academicAverage < 50) {
    reasons.push(`Assessment average is ${academicAverage}%`);
  }
  if (latestCgpa !== null && latestCgpa < 6) {
    reasons.push(`Latest CGPA is ${latestCgpa.toFixed(2)}`);
  }
  if (!reasons.length) reasons.push("Signals are within the current support thresholds");

  return {
    academicAverage,
    attendanceRate,
    latestCgpa,
    reasons,
    riskLevel: riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low",
    riskScore,
  };
}
