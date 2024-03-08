import { playwright, Locator } from 'playwright';
import logger from './logger';

/**
 * Abstract class representing common UI actions.
 */
abstract class UiActions {
    protected locator: string;
    protected page: playwright.Page;
    protected objectDescriptor: string;
    protected isPopupExist: boolean;
    protected pageIndex: number;
    protected fullCss: string;
    protected fullXpath: string;
    protected tempLocator: Locator;
    protected tempLocators: Locator[];

    /**
     * Constructs a new UiActions instance.
     * @param locator The locator string for the UI element.
     * @param options Additional options such as description, popup existence, and page index.
     */
    constructor(locator: string, options?: { description?: string, isPopup?: boolean, pageIndex?: number }) {
        this.locator = locator;
        this.fullCss = this.locator;
        // If isPopup is provided in options, assign its value; otherwise, default to false.
        this.isPopupExist = options?.isPopup ?? false;
        // If pageIndex is provided in options, assign its value; otherwise, default to 0.
        this.pageIndex = options?.pageIndex ?? 0;
        // If description is provided in options, assign its value; otherwise, default to 'object - '.
        this.objectDescriptor = options?.description ?? 'object - ';
    }

    /**
     * Retrieves the page based on popup existence and pageIndex.
     */
    protected async getPage() {
        if (this.isPopupExist === true) {
            if (playwright.popup === undefined) {
                this.page = playwright.popup;
                const [newPopup] = await Promise.all([
                    playwright.page.waitForEvent('popup')
                ]);
                playwright.popup = newPopup;
            }
            this.page = playwright.popup;
        } else {
            const pages = playwright.context.pages();
            this.page = pages[this.pageIndex];
        }
    }

    /**
     * Switches to a different page.
     * @param pageIndex The index of the page to switch to.
     */
    async switchPage(pageIndex: number) {
        this.pageIndex = pageIndex;
        return this;
    }

   
    async setLocator(locator: string, options?: { description?: string }) {
        // Set the locator and optionally the object descriptor.
        this.locator = locator;
        if (options?.description !== undefined) {
            this.objectDescriptor = options.description;
        }
        return this;
    }
    
    async clickToOpenPopup(options?: { force?: boolean }) {
        // Clicks to open a popup with an optional force parameter.
        let _force = options?.force ?? false;
        const [newPopup] = await Promise.all([
            playwright.page.waitForEvent('popup'),
            playwright.page.locator(await this.getLocator()).click({ force: _force })
        ]);
        playwright.popup = newPopup;
    }
    
    protected async getElements(options?: { index?: number }) {
        // Retrieves elements based on the locator, optionally by index.
        return await this.waitTillElementToBeReady().then(async () => {
            if (options?.index === undefined) {
                let ele = this.page.locator(await this.getLocator());
                return ele;
            }
            let ele = this.page.locator(await this.getLocator()).all();
            return ele[options.index];
        });
    }
    
    protected async getElement() {
        // Retrieves a single element based on the locator.
        return await this.waitTillElementToBeReady().then(async () => {
            return this.page.locator(await this.getLocator());
        });
    }
    
    protected async setCssAndXpath(element: Locator) {
        // Sets full CSS and XPath for the given element.
        this.fullCss = (await cssPath(element)).toString();
        this.fullXpath = (await xPath(element)).toString();
    }
    
    async clickLink(linkName: string, options?: { linkNameExactMatch?: boolean, force?: boolean }) {
        // Clicks on a link with the given name, optionally with exact match and force parameters.
        let _linkNameExactMatch = options?.linkNameExactMatch ?? true;
        let _force = options?.force ?? false;
        await this.WaitTillElementToBeReady().then(async () => {
            if (linkName) {
                await this.page.getByRole('link', {
                    name: `${linkName}`,
                    exact: _linkNameExactMatch
                }).waitFor();
                await this.page.getByRole('link', {
                    name: `${linkName}`,
                    exact: _linkNameExactMatch
                }).click({ force: _force });
                await this.clearFullCssAndXpath();
                await logger.info(`Clicked on the link with name - ${linkName} with exact match - ${_linkNameExactMatch} on ${this.objectDescriptor}`);
            }
        });
    }
    
    async clickLastLink(options?: { force?: boolean }) {
        // Clicks on the last link found with an optional force parameter.
        let _force = options?.force ?? false;
        await logger.info(`Clicked on the first link - ${this.objectDescriptor}`);
        await (await this.getElement()).first().click({ force: _force });
        await this.clearFullCssAndXpath();
    }

    async getSibling(locator: string, nthElement = 0) {
        // Retrieves a sibling element based on the given locator and nth element.
        let ele = await (await this.getElement()).locator('xpath=..').locator(locator).nth(nthElement);
        await this.setCssAndXpath(ele);
        return this;
    }
    
    async getParent() {
        // Retrieves the parent element.
        let ele = (await this.getElement()).nth(index);
        await this.setCssAndXPath(ele);
        return this;
    }
    
    async getNth(index: number) {
        // Retrieves the nth element.
        let ele = await (await this.getElement()).nth(index);
        await this.setCssAndXPath(ele);
        return this;
    }
    
    async getCount() {
        // Retrieves the count of elements.
        let length = await (await this.getElement()).count();
        await this.clearFullCssAndXpath();
        return length;
    }
    
    async getPageObject(index: number) {
        // Focuses on the nth element and returns it.
        await (await this.getElement()).nth(index).focus();
        return (await this.getElement()).nth(index);
    }
    
    async getObject(index: number) {
        // Focuses on the nth element, sets CSS and XPath, and returns the object.
        await (await this.getElement()).nth(index).focus();
        let ele = (await this.getElement()).nth(index);
        await this.setCssAndXpath(ele);
        return this;
    }
    
    async getPropertyValue(property: string, options?: { index?: number }) {
        // Retrieves the value of the specified property for the element.
        let _index = options?.index ?? 0;
        await (await this.getElement()).focus();
        let prpVal = await (await this.getElement()).nth(_index).getAttribute(property);
        await this.clearFullCssAndXpath();
        return prpVal === null ? '' : prpVal;
    }
    
    async contains(containsText: string, options?: { index?: number, locator?: string }) {
        // Checks if the element contains the specified text.
        let _index = options?.index ?? 0;
        let ele = await (await this.getElement()).filter({ hasText: `${containsText}` }).nth(_index);
        await this.setCssAndXpath(ele);
        return this;
    }
    
    async hasText(containsText: string, exactMatch = false, options?: { index?: number }) {
        // Checks if the element has the specified text.
        let _index = options?.index ?? 0;
        let ele = (await this.getElement()).getByText(`${containsText}`, { exact: exactMatch }).nth(_index);
        await this.setCssAndXpath(ele);
        return this;
    }
    
    protected async clearFullCssAndXPath() {
        // Clears full CSS and XPath.
        this.fullCss = this.locator.toString();
        this.fullXpath = ''.toString();
        return this;
    }
    
    async containsClick(containsText: string, options?: { force?: boolean, index?: number }) {
        // Clicks on the element containing the specified text.
        let _force = options?.force ?? false;
        let _index = options?.index ?? 0;
        await (await this.getElement()).filter({ hasText: `${containsText}` }).nth(_index).click({ force: _force });
        await staticWait(100); // Adding a static wait for 100 milliseconds
        await logger.info(`Clicked on the ${this.objectDescriptor} containing the text [${containsText}]`);
        await this.clearFullCssAndXPath();
    }
    
    async waitTillElementToBeReady() {
        // Waits until the element is ready.
        await this.getPage();
        await this.page.waitForTimeout(10);
        await this.page.waitForLoadState();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForLoadState('networkidle');
    }
    
    async getText(index = -1) {
        // Retrieves the text of the element.
        let _index = index === -1 ? 0 : index;
        let text = await (await this.getElement()).nth(_index).innerText();
        await this.clearFullCssAndXPath();
        await logger.info(`Getting text from ${this.objectDescriptor}`);
        return text;
    }
    
    async getCurrentObject() {
        // Returns the current object.
        return this;
    }
    
    async getPageTitle() {
        // Retrieves the page title.
        await this.getPage();
        let title = this.page.title().toString();
        await this.clearFullCssAndXPath();
        return title;
    }
    
    async isExist() {
        // Checks if the element exists.
        await this.getPage();
        await this.page.waitForLoadState();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForLoadState('networkidle');
        await this.clearFullCssAndXPath();
        let flag = await this.page.$(await this.getLocator()) != null;
        return flag;
    }
    
    async isEnabled() {
        // Checks if the element is enabled.
        let enabled = (await this.getElement()).isEnabled();
        await this.clearFullCssAndXPath();
        return enabled;
    }
    
    async isVisible() {
        // Checks if the element is visible.
        let visible = (await this.getElement()).isVisible();
        await this.clearFullCssAndXPath();
        return visible;
    }
    
    async scrollIntoView(options: string = 'End') {
        // Scrolls the page to the element.
        await this.waitTillElementToBeReady();
        await this.page.keyboard.down(options);
    }
    
    async childHasText(text: string, options?: { exactMatch?: boolean }) {
        // Checks if the child element has the specified text.
        await this.waitTillElementToBeReady();
        let _exactMatch = options?.exactMatch ?? false;
        if (_exactMatch) {
            let ele = await this.page.locator(await this.getLocator(), { has: this.page.locator(`text = "${text}"`).nth(0) }).nth(0);
            await this.setCssAndXPath(ele);
            return this;
        } else {
            let ele = await this.page.locator(`${await this.getLocator()}:has-text("${text}")`).nth(0);
            await this.setCssAndXPath(ele);
            return this;
        }
    }

    async getCss(cssValue: string) {
        // Retrieves the value of the specified CSS property.
        return await this.getPage().then(async () => {
            let locatorE = (await this.getElement());
            let jsonVal = await locatorE.evaluate((element: any) => {
                let json = JSON.parse('{}');
                let cssObj = window.getComputedStyle(element);
                for (var i = 0; i < cssObj.length; i++) {
                    json[cssObj[i]] = cssObj.getPropertyValue(cssObj[i]);
                }
                return json;
            });
            await this.clearFullCssAndXPath();
            if (jsonVal[cssValue] !== '') {
                return jsonVal[cssValue];
            } else {
                return 'Invalid property';
            }
        });
    }
    
    protected async getLocator() {
        // Retrieves the locator based on whether full CSS is set or not.
        return this.fullCss === this.locator ? this.locator : this.fullCss;
    }
    
    async getLocatorFullCss() {
        // Retrieves the full CSS locator.
        return this.fullCss;
    }
    
    async getLocatorFullXPath() {
        // Retrieves the full XPath locator.
        return this.fullXPath;
    }
    
    async find(locator: string, options?: { index?: number, hasText?: string, nthObj?: number }) {
        // Finds the element based on the specified locator and options.
        let _index = options?.index ?? 0;
        let _objIndex = options?.nthObj ?? 0;
        if (options?.hasText === undefined) {
            let ele = await this.page.locator(`${await this.getLocator()} ${locator}`).nth(_index);
            await this.setCssAndXpath(ele);
        } else {
            let ele = await (await this.getElement()).locator(locator, { hasText: `${options.hasText}` }).nth(_index);
            await this.setCssAndXpath(ele);
        }
        if (options?.nthObj !== undefined) {
            let ele = (await this.getElement()).nth(_objIndex);
            await this.setCssAndXPath(this.tempLocator);
        }
        return this;
    }
    
    async setDescription(desc: string) {
        // Sets the object descriptor.
        this.objectDescriptor = desc;
        return this;
    }
    
    async getTextAllMatchingObjects() {
        // Retrieves the text of all matching objects.
        let arr = [];
        let count = await (await this.getElement()).count();
        for (let indx = 0; indx < count; indx++) {
            await staticWait(100);
            let iText = (await (await this.getElement()).nth(indx).innerText()).toString();
            arr.push(iText.trim());
        }
        await this.clearFullCssAndXPath();
        return arr;
    }
    
    async clear(option?: { force?: boolean }) {
        // Clears the text of the element.
        let _force = option?.force === undefined ? false : true;
        let ele = await (await this.getElement());
        await this.setCssAndXPath(ele);
        await ele.clear({ force: _force });
        return this;
    }
    
    async click(options?: { objIndex?: number, force?: boolean }) {
        // Clicks on the element.
        let _objIndex = options?.objIndex === undefined ? 0 : options?.objIndex;
        let _force = options?.force ?? false;
        const obj = await (await this.getElement()).nth(_objIndex);
        await obj.click({ force: _force });
        await logger.info(`Clicked on the ${this.objectDescriptor} [${_objIndex}]`);
        await this.clearFullCssAndXPath();
    }

    async dblClick(options?: { objIndex?: number, force?: boolean }) {
        // Performs a double-click action on the element.
        let _objIndex = options?.objIndex === undefined ? 0 : options?.objIndex;
        let _force = options?.force ?? false;
        const obj = await (await this.getElement()).nth(_objIndex);
        await obj.dblclick({ force: _force });
        await logger.info(`Double-clicked on the ${this.objectDescriptor} [${_objIndex}]`);
        await this.clearFullCssAndXPath();
    }
    
    async waitForDomComplete(page: page, pollDelay = 10, stableDelay = 500) {
        // Waits until the DOM content is stable.
        let markupPrevious = '';
        const timeStart = new Date();
        let isStable = false;
        let counter = 0;
        while (!isStable) {
            ++counter;
            const markupCurrent = await page.evaluate(() => document.body.innerHTML);
            const elapsed = new Date().getTime() - timeStart.getTime();
            if (markupCurrent == markupPrevious) {
                isStable = stableDelay <= elapsed;
            } else {
                markupPrevious = markupCurrent;
            }
            if (!isStable) {
                await new Promise(resolve => setTimeout(resolve, pollDelay));
            }
        }
    }
    
    export class UiElement extends UiActions {
        constructor(locator: string, options?: { description?: string, isPopup?: boolean, pageIndex?: number }) {
            super(locator, { description: options?.description, isPopup: options?.isPopup, pageIndex: options?.pageIndex });
        }
    
        async getAllObjects(options?: { hasText?: string }): Promise<UiElement[]> {
            // Retrieves all UiElements matching the specified criteria.
            if (options?.hasText === undefined) {
                const arrayLocators = await (await this.getElement()).locator(':scope', { has: this.page.locator(this.locator) }).all();
                arrayLocators.forEach((loc: Locator) => {
                    this.tempLocators.push(loc);
                });
            } else {
                const arrayLocators = await (await this.getElement()).locator(this.locator, { hasText: `${options.hasText}` }).all();
                arrayLocators.forEach((loc: Locator) => {
                    this.tempLocators.push(loc);
                });
            }
    
            const uiElements: UiElement[] = await Promise.all(this.tempLocators.map(async (loc: any, index: number) => {
                const cssLocator = await (await cssPath(loc)).toString();
                return new UiElement(cssLocator, { description: `${this.objectDescriptor} [${index}]` });
            }));
            return uiElements;
        }
    
        async chooseFiles(files: string[]) {
            // Sets the input files for the element.
            await this.waitTillElementToBeReady().then(async () => {
                await (await this.getElement()).setInputFiles(files);
                await this.waitTillElementToBeReady();
                await this.clearFullCssAndXPath();
            });
        }
    }

    async check(options?: { objIndex?: number, force?: boolean}) {
        // Checks the checkbox element.
        let _objIndex = options?.objIndex?.valueOf() !== undefined ? -1 : options?.objIndex;
        let _force = options?.force?.valueOf() !== undefined ? options?.force : false;
        await this.waitTillElementToBeReady().then(async () => {
            const obj = _objIndex > -1 ? await (await this.getElement()).nth(_objIndex) : await (await this.getElement()).first();
            let flag =  await obj.getAttribute('disabled');
            if (!flag) {
                await obj.check({ force: _force });
                await logger.info(`${this.objectDescriptor} - checked the checkbox`);
            } else {
                await logger.info(`${this.objectDescriptor} - unable to check the checkbox, it's disabled`);
            }
            await this.clearFullCssAndXPath();
        });
    }
    
    async uncheck(options?: { objIndex?: number, force?: boolean}) {
        // Unchecks the checkbox element.
        let _objIndex = options?.objIndex?.valueOf() !== undefined ? -1 : options?.objIndex;
        let _force = options?.force?.valueOf() !== undefined ? options?.force : false;
        const obj = _objIndex > -1 ? await (await this.getElement()).nth(_objIndex) : await (await this.getElement()).first();
        let flag =  await obj.getAttribute('disabled');
        if (!flag) {
            await obj.uncheck({ force: _force });
            await logger.info(`${this.objectDescriptor} - unchecked the checkbox`);
        } else {
            await logger.info(`${this.objectDescriptor} - unable to uncheck the checkbox, it's disabled`);
        }
        await this.clearFullCssAndXPath();
    }
    
    async setValue(inputString: any, options?: { keyPress?: string, force?: boolean }) {
        // Sets the value of the element.
        let _force = options?.force?.valueOf() !== undefined ? options?.force : false;
        await (await this.getElement()).clear();
        await (await this.getElement()).fill(inputString.toString(), { force: _force });
        if (options?.keyPress?.valueOf() !== undefined) {
            await (await this.getElement()).press(options?.keyPress);
        }
        await logger.info(`${this.objectDescriptor} - set the value: ${this.objectDescriptor.toLowerCase().includes('password') ? '******' : inputString}`);
        await this.clearFullCssAndXpath();
    }
    
    async type(inputString: any, options?: { delay?: number, keyPress?: string }) {
        // Types the given input string into the element.
        let _delay = options?.delay?.valueOf() !== undefined ? 0 : options?.delay;
        await (await this.getElement()).type(inputString.toString(), { delay: _delay });
        if (options?.keyPress?.valueOf() !== undefined) {
            await (await this.getElement()).press(options?.keyPress);
        }
        await logger.info(`${this.objectDescriptor} - typed the value: ${this.objectDescriptor.toLowerCase().includes('password') ? '******' : inputString}`);
        await this.clearFullCssAndXPath();
    }
    
    async pressSequentially(inputString: any, options?: { delay?: number, keyPress?: string }) {
        // Presses the keys in sequence into the element.
        let _delay = options?.delay?.valueOf() !== undefined ? 0 : options?.delay;
        await (await this.getElement()).pressSequentially(inputString, { delay: _delay });
        if (options?.keyPress?.valueOf() !== undefined) {
            await (await this.getElement()).press(options?.keyPress);
        }
        await logger.info(`${this.objectDescriptor} - pressed sequentially: ${this.objectDescriptor.toLowerCase().includes('password') ? '******' : inputString}`);
        await this.clearFullCssAndXPath();
    }
    
    async selectListOptionsByText(option: string) {
        // Selects an option from the dropdown list by text.
        await (await this.getElement()).selectOption(option);
        await logger.info(`${this.objectDescriptor} - selected the option: ${option}`);
        await this.clearFullCssAndXPath();
    }
    
    async selectListOptionByIndex(indexOf: number) {
        // Selects an option from the dropdown list by index.
        await (await this.getElement()).selectOption({ index: indexOf });
        await logger.info(`${this.objectDescriptor} - selected the option index: ${indexOf}`);
        await this.clearFullCssAndXPath();
    }

    export class UiTable extends UiActions {
        constructor(locator: string, options?: { description?: string, isPopup?: boolean, pageIndex?: number }) {
            super(locator, { description: options?.description, isPopup: options?.isPopup, pageIndex: options?.pageIndex });
        }
    
        async getColumnHasText(cellValue: string) {
            // Filters the table column to find cells containing the specified text.
            let ele = await (await this.getElement()).locator('td').filter({ hasText: `${cellValue}` });
            await this.setCssAndXPath(ele);
            return this;
        }
    
        async waitForRowsToLoad(options?: { locator?: string }) {
            // Waits for the rows of the table to load.
            let _locator = options?.locator ?? 'tr';
            await (await this.getElement()).locator(_locator).nth(0).waitFor({ state: "attached", timeout: 60000 });
            return this;
        }
    
        async getCellData(row: number, col: number, options?: { locator?: string }) {
            // Retrieves the data from a specific cell in the table.
            let _locator = options?.locator ?? 'tr';
            await logger.info(`Getting cell data from ${this.objectDescriptor} - Row, Column [${row},${col}]`);
            let val = await (await this.getElement()).locator(_locator).nth(row).locator('td').nth(col).innerText();
            await this.clearFullCssAndXPath();
            await logger.info(`Row, Column [${row}, ${col}] = ${val}`);
            return val.toString();
        }
    
        async getRowData(row: number, options?: { locator?: string }) {
            // Retrieves the data from all cells in a specific row of the table.
            let _locator = options?.locator ?? 'tr';
            let arr = await (await this.getElement()).locator(_locator).nth(row).allInnerTexts();
            await this.clearFullCssAndXPath();
            return arr;
        }
    
        async getAllRowsColumnData(column: number, options?: { locator?: string }) {
            // Retrieves data from a specific column in all rows of the table.
            let _locator = options?.locator ?? 'tr';
            let arr = [];
            let length = await (await this.getElement()).locator(_locator).count();
            for (let index = 0; index < length; index++) {
                arr.push(await (await this.getElement()).locator(_locator).nth(index).locator('td').nth(column).innerText());
            }
            await this.clearFullCssAndXPath();
            return arr;
        }
    
        async getHeaderNames() {
            // Retrieves the names of all headers in the table.
            let arr = await (await this.getElement()).locator('th').allInnerTexts();
            await this.clearFullCssAndXPath();
            return arr;
        }
    
        async getRow(index: number, options?: { locator?: string }) {
            // Retrieves a specific row in the table.
            let _locator = options?.locator ?? 'tr';
            return await this.waitTillElementToBeReady().then(async () => {
                let ele = await (await this.getElement()).locator(_locator).nth(index);
                await this.setCssAndXPath(ele);
                return this;
            });
        }
    
        async getTable(index = 0) {
            // Retrieves the table element.
            let ele = await (await this.getElement()).nth(index);
            await this.setCssAndXPath(ele);
            return this;
        }
    
        async getHeaderColumnNumber(colName: string, exactMatch = false) {
            // Retrieves the column number of the header with the specified name.
            const innerTextArr = await (await this.getElement()).locator('th').allInnerTexts();
            await this.clearFullCssAndXPath();
            if (exactMatch) {
                return innerTextArr.findIndex((ele: string) => ele.trim() === colName.trim());
            }
            return innerTextArr.findIndex((ele: string) => ele.trim().toLowerCase() === colName.trim().toLowerCase());
        }
    
        async getHeaderName(index: number) {
            // Retrieves the name of the header at the specified index.
            let text = await (await this.getElement()).locator('th').nth(index).innerText();
            await this.clearFullCssAndXPath();
            return text;
        }
    
        async getHeaderColumnLength() {
            // Retrieves the number of columns in the table header.
            return await this.waitTillElementToBeReady().then(async () => {
                let headerCount = Number(await (await this.getElement()).locator('th').count());
                await this.clearFullCssAndXPath();
                return headerCount;
            });
        }
    
        async getRowsLength(options?: { locator?: string }) {
            // Retrieves the number of rows in the table.
            let _locator = options?.locator ?? 'tr';
            let length = await this.isExist() ? Number(await (await this.getElement()).locator(_locator).count()) : 0;
            await this.clearFullCssAndXPath();
            return length;
        }
    
        async getListOptions() {
            // Retrieves the options from a dropdown list in the table.
            let innerTexts = await this.page.locator(await this.getLocator() + ' option').allInnerTexts();
            await this.clearFullCssAndXPath();
            return innerTexts;
        }
    }

    async getMetaTableRowsLength(options?: { locator?: string }) {
        let _locator = options?.locator?.valueOf() === undefined ? 'tr' : options?.locator;
        return await this.waitTillElementToBeReady().then(async () => {
            const locator = await this.getLocator();
            this.fullCss = locator + ' ' + _locator;
            let length = await this.isExist() ? await (await this.getElement()).locator(_locator).count() : 0;
            await this.clearFullCssAndXPath();
            return length;
        });
    }
    
    async getMatchedRowIndex(rowValues: string[], options?: { locator?: string, exactMatch?: boolean }) {
        let _locator = options?.locator?.valueOf() === undefined ? 'tr' : options?.locator;
        let _exactMatch = options?.exactMatch?.valueOf() === undefined ? false : options?.exactMatch;
        let arr: string[][] = [];
        rowValues.forEach((ele, i) => {
            rowValues[i] = ele.trim().includes(`'`) ? ele.trim().split(`'`)[1] : ele.trim();
        });
        return await this.waitTillElementToBeReady().then(async () => {
            const rows = await (await this.getElement()).locator(_locator).count();
            for (let index = 0; index < rows; index++) {
                const tableData = await (await this.getElement()).locator(_locator).nth(index).allInnerTexts();
                let rowData = tableData.toString().split('\t').join('').split('\n');
                if (rowData.length > 1) {
                    arr.push(rowData);
                }
            }
            let rowIndex = arr.findIndex((rowText) => {
                for (const colData of rowValues) {
                    if (_exactMatch) {
                        if (rowText.findIndex((ele: any) => ele.trim().toLowerCase() === colData.toLowerCase().trim()) < 0) return false;
                    } else {
                        if (rowText.findIndex((ele: any) => !ele.trim().toLowerCase().includes(colData.toLowerCase().trim())) >= 0) return false;
                    }
                }
                return true;
            });
            await this.clearFullCssAndXPath();
            return rowIndex >= 0 ? rowIndex : -1;
        });
    }

    async getMatchedRowIndices(rowValues: string[], options?: {locator?: string, exactMatch?: boolean}){
        let _locator = options?.locator?.valueOf() === undefined ? 'tr' : options?.locator;
        let _exactMatch = options?.exactMatch?.valueOf() === undefined ? false : options?.exactMatch;
        rowValues.forEach((ele,  i) => {
            rowValues[i] = ele.trim().includes(`'`) ? ele.trim().split(`'`)[1] : ele.trim();
        });
        let foundIndices: number[] = [];
        const nRows = await (await this.getElement()).count();
        for (let index = 0; index < nRows; index++) {
            await (await this.getElement()).locator(_locator).nth(index).allInnerTexts().then(async (row_text) => {
                let row_text_arr = row_text.toString().split('\n');
                let flag = true;
                for(const col_data of rowValues){
                    if (_exactMatch) {
                        if (row_text_arr.findIndex(ele => ele.trim().toLowerCase() === col_data.toLowerCase().trim()) < 0) {
                            flag = false;
                            break;
                        }
                    } else {
                        if (row_text_arr.findIndex(ele => ele.trim().toLowerCase().includes(col_data.toLowerCase().trim())) < 0) {
                            flag = false;
                            break;
                        }
                    }
                }
                if (flag) {
                    foundIndices.push(index);
                }
            });
        }
        await this.clearFullCssAndXPath();
        return foundIndices;
    }
    
    async getMetaTableMatchedRowIndex(rowValues: string[], options?: { locator?: string, exactMatch?: boolean }) {
        let _locator = options?.locator?.valueOf() === undefined ? 'tr' : options?.locator;
        let _exactMatch = options?.exactMatch?.valueOf() === undefined ? false : options?.exactMatch;
        let arr: string[][] = [];
        rowValues.forEach((ele,  i) => {
            rowValues[i] = ele.trim();
        });
        await (await this.getElement()).locator(_locator).nth(0).waitFor();
        const rows = await (await this.getElement()).locator(_locator).count();
        for (let index = 0; index < rows; index++) {
            const table_data = await ((await this.getElement()).locator(_locator).nth(index).allInnerTexts());
            let rowdata = table_data.toString().split('\t').join('').split('\n');
            if (rowdata.length > 1) {
                arr.push(rowdata);
            }
        }
        let rowIndex = arr.findIndex((row_text) => {
            let flag = true;
            for (const col_data of rowValues) {
                if (_exactMatch) { 
                    if (row_text.findIndex((ele: any) => ele.trim().toLowerCase() === col_data.toLowerCase().trim()) < 0) {
                        flag = false;
                        break;
                    }
                } else { 
                    if (row_text.findIndex((ele: any) => !ele.trim().toLowerCase().includes(col_data.toLowerCase().trim())) >= 0) {
                        flag = false;
                        break;
                    }
                }
            }
            return flag;
        });
        await this.clearFullCssAndXPath();
        return rowIndex >= 0 ? rowIndex : -1;
    }

    async getMetaTableMatchedRowIndices(rowValues: string[], options?: { locator?: string, exactMatch?: boolean, minColumnSize: number }) {
        // Extract options or set defaults
        let _locator = options?.locator || 'tr';
        let _exactMatch = options?.exactMatch ?? false;
        let _minColumnSize = options?.minColumnSize ?? 1;
    
        // Log received data
        console.log('Received data: ' + rowValues);
    
        // Initialize arrays
        let arr = new Array();
        let foundIndices = new Array();
    
        // Retrieve rows from the table
        let rows = await (await this.getElement()).locator(_locator).all();
    
        // Process each row
        for (let row of rows) {
            let arrTds = new Array();
    
            // Retrieve cells from the row
            let cols = await row.locator('td').all();
    
            // Process each cell
            for (let col of cols) {
                // Get text from cell and trim
                arrTds.push((await col.innerText()).toString().trim());
            }
    
            // Check if the row has enough columns
            if (arrTds.length > _minColumnSize) {
                arr.push(arrTds);
            }
        }
    
        // Search for rows matching the criteria
        for (let indx = 0; indx < arr.length; indx++) {
            let row_index = arr.findIndex((row_text: any) => {
                for (const col_data of rowValues) {
                    if (_exactMatch) {
                        // Check if cell value exactly matches
                        if (row_text.findIndex((ele: any) => ele.trim().toLowerCase() === col_data.toLowerCase().trim()) < 0) return false;
                    } else {
                        // Check if cell value contains the given value
                        if (row_text.findIndex((ele: any) => ele.trim().toLowerCase().includes(col_data.toLowerCase().trim())) < 0) return false;
                    }
                }
                return true;
            });
    
            // If a matching row is found, add its index to foundIndices
            if (row_index >= 0) {
                arr[row_index] = [];
                foundIndices.push(row_index);
            }
        }
    
        return foundIndices;
    }

    async clickMetaTableRowLink(rowIndex: number, options?: { linkName?: string, lnkIndex?: number, locator?: string }) {
        // Extract options or set defaults
        let _locator = options?.locator || 'tr';
        let _linkName = options?.linkName || false;
        let _lnkIndex = options?.lnkIndex ?? -1;
    
        // Get the row element
        const row = await (await this.getElement()).nth(rowIndex).locator(_locator).nth(0);
    
        // Find the link element based on provided options
        const link = _linkName !== '' ? await row.filter({ hasText: `${_linkName}` }) : (_lnkIndex > -1 ? await row.locator('a').nth(_lnkIndex - 1) : await row.locator('a').first());
    
        // Click the link
        await link.click();
    
        // Clear CSS and XPath after action
        await this.clearFullCssAndXPath();
    }
    
    async isColumnValueExist(colValue: string) {
        // Check if column value exists
        let exist = await (await this.getElement()).locator('td').filter({ hasText: `${colValue}` }).count() > 0;
    
        // Clear CSS and XPath after action
        await this.clearFullCssAndXPath();
    
        return exist;
    }
    
    async clickRowLink(rowIndex: number, options?: { linkIndex?: number, force?: boolean, locator?: string }) {
        // Extract options or set defaults
        let _lIndex = options?.linkIndex ?? 0;
        let _force = options?.force ?? false;
    
        // Get the row element
        const row = await (await this.getElement()).nth(rowIndex);
    
        // Click the link in the row based on provided options
        await row.locator('a').nth(_lIndex).click({ force: _force });
    
        // Clear CSS and XPath after action
        await this.clearFullCssAndXPath();
    }

    async metaTableClickRowLink(rowIndex: number, options?: { locator?: string, lnkIndex?: number }) {
        // Extract options or set defaults
        let _locator = options?.locator || 'tr';
        let _lnkIndex = options?.lnkIndex ?? -1;
    
        // Get the row element
        const row = await (await this.getElement()).nth(rowIndex).locator(_locator).nth(0);
    
        // Click the link within the row based on provided options
        await row.getByRole('link').nth(_lnkIndex).click();
    
        // Clear CSS and XPath after action
        await this.clearFullCssAndXPath();
    }

    export const playwright = {
        page: undefined as page,
        apiContext: undefined as APIRequestContext,
        popup: undefined as page,
        newPage: undefined as page,
        context: undefined as BrowserContext,
        browser: undefined as Browser
    };
    
    export const invokeBrowser = async (browserType: string, options?: { headless?: boolean, channel?: string }) => {
        console.log('in invoke browser : ' + browserType);
        let _headless = options?.headless ?? true;
        let _channel = options?.channel ?? '';
        
        switch (browserType) {
            case "chrome":
                return await chromium.launch({ headless: _headless });
            case "firefox":
                return await firefox.launch({ headless: _headless });
            case "webkit":
                return await webkit.launch({ headless: _headless });
            case "msedge":
                return await chromium.launch({
                    channel: 'msedge',
                    headless: _headless
                });
            default:
                return await chromium.launch({ headless: _headless });
        }
    };
    
    export async function waitForPageLoad() {
        await playwright.page.waitForLoadState('domcontentloaded');
        await playwright.page.waitForLoadState('networkidle');
        await playwright.page.waitForLoadState();
        return true;
    }
    
    export async function waitForUrl(url: string) {
        await logger.info('waiting for the url : ' + url);
        await playwright.page.waitForURL(url, { timeout: 120000, waitUntil: 'domcontentloaded' });
    }
    
    export async function staticWait(timeOut: number, isPage: boolean = true) {
        console.log(`waiting for seconds ${timeOut}`);
        if (isPage) {
            console.log(`waiting for the page : ${timeOut} milliseconds`);
            await playwright.page.waitForTimeout(timeOut);
        } else {
            console.log(`waiting for the popup : ${timeOut} milliseconds`);
            await playwright.popup.waitForTimeout(timeOut);
        }
    }
    
    export async function goToUrl(url: string) {
        await playwright.page.goto(url, { timeout: 500000, waitUntil: 'networkidle' });
        await logger.info('Launching URL : ' + url);
    }
    
    export async function closeplaywright() {
        if (playwright.popup !== undefined) {
            await playwright.popup.close();
        }
        if (playwright.page) {
            await playwright.page.close();
        }
    }
    
    export async function getUrl(pageIndex: number = 0) {
        const pages = playwright.context.page();
        const page = pages[pageIndex];
        await waitForPageLoad();
        return page.url().toString();
    }
    
    export async function pause(options?: { isPage?: boolean }) {
        let _flag = options?.isPage ?? true;
        if (_flag) {
            await playwright.page.pause();
        } else {
            await playwright.popup.pause();
        }
    }
    
    export async function refreshPage(options?: { isPage?: boolean }) {
        let _flag = options?.isPage ?? true;
        if (_flag) {
            await playwright.page.reload();
        } else {
            await playwright.popup.reload();
        }
    }
    
    export async function getApiResponse(url: string) {
        const response = await playwright.page.waitForResponse((response) => response.url().includes(url));
        return response;
    }

    export async function keyboard(method: string, key: string, options?: { isPage?: boolean, pageIndex?: number }) {
        // Check if the action should be performed on the page or popup
        let _isPage = options?.isPage ?? true;
        let _pageIndex = options?.pageIndex ?? 0;
        let page: page;
    
        if (_isPage !== true) {
            // If the action is not on the page, handle popup
            if (playwright.popup === undefined) {
                const [newPopup] = await Promise.all([
                    playwright.page.waitForEvent('popup')
                ]);
                playwright.popup = newPopup;
            }
            page = playwright.popup;
        } else {
            // If the action is on the page, select the appropriate page
            const pages = playwright.context.pages();
            page = pages[_pageIndex];
        }
    
        // Log the keyboard action
        await logger.info(`Keyboard method: ${method} - ${key}`);
    
        // Perform the specified keyboard action
        switch (method.toLowerCase().trim()) {
            case 'type':
                await page.keyboard.type(key);
                return;
            case 'up':
                await page.keyboard.up(key);
                return;
            case 'down':
                await page.keyboard.down(key);
                return;
            case 'press':
                await page.keyboard.press(key);
                return;
            case 'up':
                await page.keyboard.innerText(key); // This case seems to be duplicate. Should be removed.
                return;
        }
    }
    



}
