import { expect, test, type Page } from '@playwright/test';

// A test's Start / Take again link in the list of open tests (its results are listed too)
const openTest = (page: Page, title: string) =>
  page.locator('section', { has: page.getByRole('heading', { name: 'Open tests' }) })
    .getByRole('listitem').filter({ hasText: title })
    .getByRole('link', { name: /^(Start test|Take again)$/ });

async function signInAs(page: Page, who: 'student' | 'teacher' | 'admin') {
  await page.goto('/login');
  await page.getByRole('button', { name: `Demo ${who}` }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('student', () => {
  test('takes a test and reviews the marked answer sheet @phone', async ({ page }) => {
    await signInAs(page, 'student');
    await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();

    // open a test from the list
    await openTest(page, 'Physics Quick Quiz').click();
    await expect(page.getByRole('heading', { name: 'Physics Quick Quiz' })).toBeVisible();
    await page.getByRole('button', { name: /Begin the test|Start over/ }).click();

    // answer every question with its first option
    const total = Number((await page.getByText(/Question 1 of \d+/).textContent())?.match(/of (\d+)/)?.[1]);
    expect(total).toBeGreaterThan(0);
    for (let i = 1; i <= total; i++) {
      await expect(page.getByText(`Question ${i} of ${total}`)).toBeVisible();
      await page.getByRole('radiogroup').locator('label').first().click();
      if (i < total) await page.getByRole('button', { name: 'Next' }).click();
    }

    await page.getByRole('button', { name: 'Review and submit' }).click();
    const dialog = page.getByRole('dialog', { name: 'Submit your answers?' });
    await expect(dialog).toContainText(`You answered ${total} of ${total} questions`);
    await dialog.getByRole('button', { name: 'Submit answers' }).click();

    // the marked sheet: a score, one row per question, and the answer key once opened
    await expect(page.getByRole('heading', { name: /You scored \d+(\.\d+)? of \d+/ })).toBeVisible();
    const sheet = page.locator('section', { has: page.getByRole('heading', { name: 'Your answer sheet, marked' }) });
    await expect(sheet.locator('ol > li')).toHaveCount(total);
    await sheet.locator('ol > li summary').first().click();
    await expect(sheet.getByText(/Correct answer|Your answer, correct/).first()).toBeVisible();
  });

  test('never receives the answer key while taking a test', async ({ page }) => {
    const leaks: string[] = [];
    page.on('response', async (response) => {
      if (!/findOneWithQuestions/.test(response.url())) return;
      const body = await response.text().catch(() => '');
      if (/isCorrectAnswer|"marks"/.test(body)) leaks.push(response.url());
    });
    await signInAs(page, 'student');
    await openTest(page, 'Mathematics Practice Test').click();
    await expect(page.getByRole('heading', { name: 'Mathematics Practice Test' })).toBeVisible();
    expect(leaks).toEqual([]);
  });

  test('cannot open the teacher pages', async ({ page }) => {
    await signInAs(page, 'student');
    await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();
    await page.goto('/teach');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Open tests')).toBeVisible();
  });
});

test.describe('teacher', () => {
  // read only: the teacher's demo data stays as it is
  test('sees their test and the class answer sheet', async ({ page }) => {
    await signInAs(page, 'teacher');
    await expect(page).toHaveURL(/\/teach$/);
    const row = page.getByRole('listitem').filter({ hasText: 'Linear and quadratic equations' });
    await row.getByRole('link', { name: 'Results' }).click();

    await expect(page.getByText(/students? handed it in/)).toBeVisible();
    await expect(page.getByText(/was the hardest/)).toBeVisible();
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(6);
    await expect(page.locator('table tfoot')).toContainText('Got it right');
  });
});

test.describe('admin', () => {
  // read only: no user is activated/deactivated and no setting is saved
  test('lands on the admin area and can browse people and settings', async ({ page }) => {
    await signInAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /Hello|Admin/ })).toBeVisible();

    // the People screen lists accounts with role filters
    await page.getByRole('link', { name: 'Admin' }).click(); // stay in the area via the header
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
    await expect(page.getByText('demo-teacher@example.com')).toBeVisible();
    await page.getByRole('button', { name: 'teacher', exact: true }).click(); // filter pill (CSS-capitalised)
    await expect(page.getByText('demo-teacher@example.com')).toBeVisible();

    // platform settings load the real white-label values
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Platform settings' })).toBeVisible();
    await expect(page.getByLabel('Product name')).toHaveValue(/.+/);
  });

  test('a student cannot reach the admin area', async ({ page }) => {
    await signInAs(page, 'student');
    await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible(); // wait for sign-in to settle
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/); // bounced back to their own tests
    await expect(page.getByText('Open tests')).toBeVisible();
  });
});
