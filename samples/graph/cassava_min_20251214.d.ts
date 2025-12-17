/** The custom element used for <cassava-grid>. */
export class CassavaGridElement extends HTMLElement {
    /**
     * Registers a new macro. If macroText is empty, the macro will be deleted.
     *
     * If the macroName is '!statusbar.cms', a status bar will be shown and the
     * macro will be executed every time the status bar may need to be updated.
     *
     * If the macroName is '!format.cms', the macro will be executed for each cell
     * rendering, and the result will be displayed instead of the raw data.
     *
     * @param {string} macroName
     * @param {string} macroText
     */
    addMacro(macroName: string, macroText: string): Promise<void>;
    /**
     * Gets the number of rows.
     *
     * @returns {number}
     */
    bottom(): number;
    /**
     * Gets the cell data.
     *
     * @param {number} x
     * @param {number} y
     * @returns {string}
     */
    cell(x: number, y: number): string;
    /**
     * Gets the macro text for the given name.
     *
     * @param {string} macroName
     * @returns {string?}
     */
    getMacro(macroName: string): string | null;
    /**
     * Gets all registered macro names.
     *
     * @returns {Array<string>}
     */
    getMacroNames(): Array<string>;
    /**
     * Runs the registered macro for the given name.
     *
     * @param {string} macroName
     */
    runNamedMacro(macroName: string): Promise<void>;
    /**
     * Runs the given script as a macro.
     *
     * @param {string} macro
     */
    runMacro(macro: string): Promise<void>;
    /**
     * Gets the number of columns.
     *
     * @returns {number}
     */
    right(): number;
    /**
     * Sets the cell data.
     * The value will be converted to a string using toString().
     *
     * @param {number} x
     * @param {number} y
     * @param {any} value
     */
    setCell(x: number, y: number, value: any): void;
    #private;
}
