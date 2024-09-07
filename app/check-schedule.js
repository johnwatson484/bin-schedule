import { Builder, Browser, By, Key, until } from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/chrome.js'
import MONTHS from './months.js'
import sendEmail from './send-email.js'

const POSTCODE = process.env.POSTCODE
const ADDRESS = process.env.ADDRESS

const checkSchedule = async () => {
  const options = new Options()
  options.addArguments('no-sandbox')
  options.addArguments('disable-dev-shm-usage')
  options.addArguments('headless')
  options.addArguments('disable-gpu')
  options.addArguments('user-data-dir=/tmp/google-chrome')
  options.addArguments('remote-debugging-pipe')
  const driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build()
  try {
    await driver.get('https://www.gateshead.gov.uk/article/3150/Bin-collection-day-checker')
    await driver.wait(until.titleIs('Bin collection day checker - Gateshead Council'), 2000)
    await driver.findElement(By.name('BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPPOSTCODE')).sendKeys(POSTCODE, Key.RETURN)
    await driver.wait(until.elementLocated(By.id('BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPADDRESS')), 2000)
    await driver.sleep(2000)
    await driver.findElement(By.id('BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPADDRESS')).sendKeys(ADDRESS, Key.RETURN)
    await driver.wait(until.elementLocated(By.css('.bincollections__table')), 5000)
    const rows = await driver.findElements(By.tagName('tr'))
    let month = MONTHS.JANUARY
    let isBinCollectionDay = false
    const currentDate = new Date()
    for (const row of rows) {
      const th = await row.findElements(By.tagName('th'))
      if (th.length) {
        month = await th[0].getText()
      } else {
        const td = await row.findElements(By.tagName('td'))
        const date = await td[0].getText()
        const day = await td[1].getText()
        const bin = await td[2].getText()
        if (month === MONTHS[currentDate.getMonth()] && date === currentDate.getDate().toString().padStart(2, '0')) {
          isBinCollectionDay = true
          const message = `Bin Day - ${day} ${date} ${month} - ${bin}`
          console.log(message)
          sendEmail(message)
          break
        }
      }
    }
    if (!isBinCollectionDay) {
      console.log('No bin collection today')
    }
  } finally {
    await driver.quit()
  }
}

export default checkSchedule
