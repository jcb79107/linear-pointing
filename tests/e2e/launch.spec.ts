import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test('public help and privacy explain data deletion and remain accessible', async ({page}) => {
  for (const path of ['/privacy','/support']) {
    await page.goto(path);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await expect(page.getByRole('link',{name:/account data|Settings/}).first()).toBeVisible();
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
test('Jared facilitates instead of casting a landing-page vote',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.focused-voter')).toHaveCount(3);
  await expect(page.locator('.focused-product-demo')).toContainText('Jared · Facilitator');
  await expect(page.locator('.focused-round-heading')).toContainText('3/3 voted');
});
test('account deletion confirms and preserves recovery after an error',async({page})=>{
  let requests=0;
  await page.route('**/api/account',r=>{requests++; return r.fulfill({status:503,json:{error:'Could not delete. Try again.'}});});
  await page.route('**/api/slack/**',r=>r.fulfill({json:{connection:null}}));
  await page.goto('http://127.0.0.1:3005/?screen=settings');
  await page.getByRole('button',{name:'Delete my account',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  expect(requests).toBe(0);
  await page.getByRole('button',{name:'Delete my account',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Delete my account',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not delete');
  expect(requests).toBe(1);
});
