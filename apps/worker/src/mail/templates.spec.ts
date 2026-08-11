import { describe, expect, it } from "vitest";

import { renderMail, renderResetMail, renderVerificationMail, renderWelcomeMail } from "./templates";

describe("mail templates", () => {
  it("renders a verification mail with a token link and base url", () => {
    const token = "tok+en/1=";
    const mail = renderVerificationMail({ firstName: "Ann", token, baseUrl: "http://localhost:3000/" });

    expect(mail.subject).toBe("Verify your Amni email");
    expect(mail.html).toContain(`/verify?token=${encodeURIComponent(token)}`);
    expect(mail.html).toContain("Verify your email");
    expect(mail.text).toContain(`/verify?token=${encodeURIComponent(token)}`);
  });

  it("renders a reset mail with an expiry note", () => {
    const mail = renderResetMail({ firstName: "Ann", token: "abc", baseUrl: "https://app.amni.dev" });

    expect(mail.subject).toBe("Reset your Amni password");
    expect(mail.html).toContain("/reset?token=abc");
    expect(mail.html).toContain("This link expires in 1 hour");
  });

  it("renders a welcome mail with the company name", () => {
    const mail = renderWelcomeMail({ firstName: "Ann", companyName: "Acme & Sons" });

    expect(mail.subject).toBe("Welcome to Amni, Ann!");
    expect(mail.html).toContain("Acme &amp; Sons");
    expect(mail.text).toContain("Acme & Sons");
  });

  it("escapes user-controlled names in html", () => {
    const mail = renderVerificationMail({
      firstName: `<img src=x onerror=alert(1)>`,
      token: "abc",
      baseUrl: "http://localhost:3000",
    });

    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("dispatches a job to the matching template", () => {
    const job = {
      template: "verification",
      to: "ann@acme.co",
      firstName: "Ann",
      token: "abc",
    };
    const mail = renderMail(job, "http://localhost:3000");

    expect(mail.subject).toBe("Verify your Amni email");
    expect(mail.html).toContain("/verify?token=abc");
  });

  it("dispatches a welcome job", () => {
    const mail = renderMail(
      { template: "welcome", to: "ann@acme.co", firstName: "Ann", companyName: "Acme" },
      "http://localhost:3000",
    );

    expect(mail.subject).toBe("Welcome to Amni, Ann!");
    expect(mail.html).toContain("Acme");
  });
});
