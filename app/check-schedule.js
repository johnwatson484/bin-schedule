import { Builder, Browser, By, Key, until } from 'selenium-webdriver'
import MONTHS from './months.js'
import sendEmail from './send-email.js'

const POSTCODE = process.env.POSTCODE
const ADDRESS = process.env.ADDRESS

async function checkSchedule () {
  const driver = await new Builder().forBrowser(Browser.CHROME).build()
  try {
    await driver.get('https://services.gateshead.gov.uk/bin-collection-dates')
    await driver.wait(until.titleIs('Bin collection day checker - Gateshead Council'), 2000)
    await driver.findElement(By.name('BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPPOSTCODE')).sendKeys(POSTCODE, Key.RETURN)
    await driver.wait(until.elementLocated(By.id('BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPADDRESS')), 2000)
    await driver.sleep(2000)
    await driver.findElement(By.id('BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPADDRESS')).sendKeys(ADDRESS, Key.RETURN)
    await driver.wait(until.elementLocated(By.css('.bincollections__table')), 5000)
    const rows = await driver.findElements(By.tagName('tr'))
    let month = MONTHS.JANUARY
    for (const row of rows) {
      const th = await row.findElements(By.tagName('th'))
      if (th.length) {
        month = await th[0].getText()
      } else {
        const td = await row.findElements(By.tagName('td'))
        const date = await td[0].getText()
        const day = await td[1].getText()
        const bin = await td[2].getText()
        const currentDate = new Date()
        if (month === MONTHS[currentDate.getMonth] && date === currentDate.getDate().toString().padStart(2, '0')) {
          const message = `Bin Day - ${day} ${date} ${month} - ${bin}`
          console.log(message)
          sendEmail(message)
        }
      }
    }
  } finally {
    await driver.quit()
  }
}

export default checkSchedule
