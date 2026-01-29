import { describe, expect, it } from "vitest";
import { sanitizeEmailBody } from "./sanitize-email-body.js";

describe("sanitizeEmailBody", () => {
  it("returns empty string for falsy input", () => {
    expect(sanitizeEmailBody("")).toBe("");
    expect(sanitizeEmailBody(null as unknown as string)).toBe("");
    expect(sanitizeEmailBody(undefined as unknown as string)).toBe("");
  });

  it("passes through plain text unchanged", () => {
    expect(sanitizeEmailBody("Hello world")).toBe("Hello world");
  });

  // --- HTML stripping ---

  it("strips basic HTML tags", () => {
    expect(sanitizeEmailBody("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("removes style blocks and their contents", () => {
    const html = '<style type="text/css">.foo { color: red; }</style><p>Content</p>';
    expect(sanitizeEmailBody(html)).toBe("Content");
  });

  it("removes script blocks", () => {
    const html = "<script>alert('xss')</script><p>Safe</p>";
    expect(sanitizeEmailBody(html)).toBe("Safe");
  });

  it("removes HTML comments", () => {
    const html = "<!-- comment --><p>Visible</p>";
    expect(sanitizeEmailBody(html)).toBe("Visible");
  });

  // --- Newline conversion ---

  it("converts <br> to newlines", () => {
    expect(sanitizeEmailBody("Line 1<br>Line 2<br/>Line 3")).toBe("Line 1\nLine 2\nLine 3");
  });

  it("converts block-level closing tags to newlines", () => {
    const html = "<div>Block 1</div><div>Block 2</div>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Block 1");
    expect(result).toContain("Block 2");
    expect(result).toMatch(/Block 1\n+Block 2/);
  });

  // --- HTML entities ---

  it("decodes named HTML entities", () => {
    expect(sanitizeEmailBody("&amp; &lt; &gt; &quot; &nbsp;")).toBe('& < > "');
  });

  it("decodes numeric decimal entities", () => {
    expect(sanitizeEmailBody("&#65;&#66;&#67;")).toBe("ABC");
  });

  it("decodes numeric hex entities", () => {
    expect(sanitizeEmailBody("&#x41;&#x42;&#x43;")).toBe("ABC");
  });

  it("decodes typographic entities", () => {
    expect(sanitizeEmailBody("&ldquo;Hello&rdquo; &mdash; world")).toBe(
      "\u201CHello\u201D — world",
    );
  });

  // --- Data URIs / base64 ---

  it("removes base64 data URIs", () => {
    const html = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="pic"><p>Text</p>';
    expect(sanitizeEmailBody(html)).toBe("Text");
  });

  it("removes inline base64 content", () => {
    const html = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP some text after";
    const result = sanitizeEmailBody(html);
    expect(result).not.toContain("base64");
    expect(result).toContain("some text after");
  });

  // --- Tracking pixels ---

  it("removes 1x1 tracking pixel images", () => {
    const html = '<img width="1" height="1" src="https://tracker.com/pixel.gif"><p>Content</p>';
    expect(sanitizeEmailBody(html)).toBe("Content");
  });

  it("removes display:none images", () => {
    const html = '<img style="display:none" src="https://tracker.com/pixel.gif"><p>Content</p>';
    expect(sanitizeEmailBody(html)).toBe("Content");
  });

  // --- Links ---

  it("keeps link text, drops tracking hrefs", () => {
    const html = '<a href="https://example.com/unsubscribe">Click here</a>';
    expect(sanitizeEmailBody(html)).toBe("");
  });

  it("keeps useful link text", () => {
    const html = '<a href="https://example.com/article">Read more</a>';
    expect(sanitizeEmailBody(html)).toBe("Read more");
  });

  // --- Footer patterns ---

  it("removes unsubscribe text", () => {
    const html = "<p>Real content</p><p>Unsubscribe from this mailing list</p>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Real content");
    expect(result).not.toMatch(/unsubscribe/i);
  });

  it("removes 'sent from my iPhone'", () => {
    const html = "<p>Hey!</p><p>Sent from my iPhone</p>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Hey!");
    expect(result).not.toMatch(/sent from my iphone/i);
  });

  it("removes 'Get Outlook for iOS'", () => {
    const html = "<p>Meeting at 3</p><p>Get Outlook for iOS</p>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Meeting at 3");
    expect(result).not.toMatch(/get outlook/i);
  });

  it("removes confidentiality notices", () => {
    const html =
      "<p>Actual content</p><p>Confidentiality notice: This email is intended solely for the use of the individual to whom it is addressed.</p>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Actual content");
    expect(result).not.toMatch(/confidentiality notice/i);
  });

  it("removes copyright notices", () => {
    const html = "<p>Content</p><p>© 2024 Acme Corp. All rights reserved.</p>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Content");
    expect(result).not.toMatch(/all rights reserved/i);
  });

  it("removes 'you are receiving this email because'", () => {
    const html =
      "<p>Newsletter</p><p>You are receiving this email because you signed up on our website.</p>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Newsletter");
    expect(result).not.toMatch(/you are receiving/i);
  });

  it("removes privacy policy / terms of service", () => {
    const html = "<p>Content</p><p>Privacy Policy | Terms of Service</p>";
    const result = sanitizeEmailBody(html);
    expect(result).toContain("Content");
    expect(result).not.toMatch(/privacy policy/i);
  });

  // --- Whitespace collapsing ---

  it("collapses excessive blank lines to max 2 newlines", () => {
    const html = "<p>A</p>\n\n\n\n\n<p>B</p>";
    const result = sanitizeEmailBody(html);
    expect(result).not.toMatch(/\n{3,}/);
    expect(result).toContain("A");
    expect(result).toContain("B");
  });

  it("trims each line and removes leading/trailing whitespace", () => {
    const html = "  <p>  Hello  </p>  <p>  World  </p>  ";
    const result = sanitizeEmailBody(html);
    expect(result).not.toMatch(/^\s/);
    expect(result).not.toMatch(/\s$/);
    for (const line of result.split("\n")) {
      expect(line).toBe(line.trim());
    }
  });

  it("collapses multiple spaces to single space", () => {
    expect(sanitizeEmailBody("Hello    world    here")).toBe("Hello world here");
  });

  // --- Real-world-ish email ---

  it("handles a typical marketing email", () => {
    const html = `
      <html>
      <head>
        <style>.header { background: blue; } .footer { font-size: 10px; }</style>
      </head>
      <body>
        <div class="header">
          <img src="https://cdn.example.com/logo.png" alt="Logo">
        </div>
        <div class="content">
          <h1>Big Sale!</h1>
          <p>Save 50% on everything this weekend.</p>
          <p>Use code: <b>SAVE50</b></p>
          <a href="https://shop.example.com">Shop Now</a>
        </div>
        <div class="footer">
          <img width="1" height="1" src="https://tracker.example.com/open.gif">
          <p>You are receiving this email because you subscribed to our newsletter.</p>
          <p><a href="https://example.com/unsubscribe?id=123">Unsubscribe</a> | 
             <a href="https://example.com/manage-preferences">Manage Preferences</a></p>
          <p>© 2024 Example Corp. All rights reserved.</p>
          <p>Privacy Policy | Terms of Service</p>
        </div>
      </body>
      </html>
    `;
    const result = sanitizeEmailBody(html);

    // Should keep
    expect(result).toContain("Big Sale!");
    expect(result).toContain("Save 50% on everything this weekend.");
    expect(result).toContain("SAVE50");
    expect(result).toContain("Shop Now");

    // Should remove
    expect(result).not.toContain("<");
    expect(result).not.toContain("style");
    expect(result).not.toMatch(/tracker/);
    expect(result).not.toMatch(/unsubscribe/i);
    expect(result).not.toMatch(/all rights reserved/i);
    expect(result).not.toMatch(/privacy policy/i);
  });
});
