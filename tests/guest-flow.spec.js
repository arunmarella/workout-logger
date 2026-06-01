const { test, expect } = require('@playwright/test');

test.describe('Workout Logger - Guest Access Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
  });

  test('should show auth screen initially and let user enter Guest Mode', async ({ page }) => {
    // 1. Verify we are on the welcome back / login screen
    await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible();

    // 2. Verify "Continue as Guest" button is present and click it
    const guestBtn = page.getByRole('button', { name: /Continue as Guest/i });
    await expect(guestBtn).toBeVisible();
    await guestBtn.click();

    // 3. Verify page redirects/renders the Library view
    await expect(page.getByText('Template Library')).toBeVisible();

    // 4. Verify localStorage has guest flag set
    const guestFlag = await page.evaluate(() => localStorage.getItem('workout_logger_guest'));
    expect(guestFlag).toBe('true');
  });

  test('should gate "My Templates" and "History" tabs with SignUp modal', async ({ page }) => {
    // Go to guest mode
    await page.getByRole('button', { name: /Continue as Guest/i }).click();
    await expect(page.getByText('Template Library')).toBeVisible();

    // Verify lock icons exist on tabs
    const myTemplatesTab = page.getByRole('button', { name: /My Templates 🔒/i });
    const historyTab = page.getByRole('button', { name: /History 🔒/i });
    await expect(myTemplatesTab).toBeVisible();
    await expect(historyTab).toBeVisible();

    // Click My Templates tab and verify Sign Up modal displays
    await myTemplatesTab.click();
    await expect(page.getByRole('heading', { name: 'Build Your Routine' })).toBeVisible();
    await expect(page.getByText('Create and customize your own workout templates.')).toBeVisible();

    // Click Cancel and verify modal is dismissed
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Build Your Routine' })).not.toBeVisible();

    // Click History tab and verify Sign Up modal displays
    await historyTab.click();
    await expect(page.getByRole('heading', { name: 'Track Your Progress' })).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Track Your Progress' })).not.toBeVisible();
  });

  test('should gate "Copy to My Templates" action', async ({ page }) => {
    // Go to guest mode
    await page.getByRole('button', { name: /Continue as Guest/i }).click();
    await expect(page.getByText('Template Library')).toBeVisible();

    // Locate the clone template button on a library template card
    const copyBtn = page.getByRole('button', { name: /Copy to My Templates/i }).first();
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Verify Sign Up modal pops up
    await expect(page.getByRole('heading', { name: 'Customize Your Workouts' })).toBeVisible();
    await expect(page.getByText('Sign up or log in to copy library templates')).toBeVisible();

    // Cancel modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Customize Your Workouts' })).not.toBeVisible();
  });

  test('should clear guest state when exiting Guest Mode', async ({ page }) => {
    // Go to guest mode
    await page.getByRole('button', { name: /Continue as Guest/i }).click();
    await expect(page.getByText('Template Library')).toBeVisible();

    // Click Exit Guest Mode door icon button
    const exitBtn = page.getByRole('button', { name: 'Exit Guest Mode' });
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // Verify we are back on Auth page and localStorage is cleared
    await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible();
    const guestFlag = await page.evaluate(() => localStorage.getItem('workout_logger_guest'));
    expect(guestFlag).toBeNull();
  });

});
