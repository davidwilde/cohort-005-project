import { describe, it, expect } from "vitest";
import { submitQuizSchema } from "../schemas";

describe("submitQuizSchema", () => {
  it("reads the quiz id from the form as a number", () => {
    expect(submitQuizSchema.parse({ quizId: "7" })).toEqual({ quizId: 7 });
  });

  it("refuses an empty quiz id rather than reading it as 0", () => {
    expect(submitQuizSchema.safeParse({ quizId: "" }).success).toBe(false);
  });

  it("refuses a missing or non-numeric quiz id", () => {
    expect(submitQuizSchema.safeParse({}).success).toBe(false);
    expect(submitQuizSchema.safeParse({ quizId: "abc" }).success).toBe(false);
  });
});
