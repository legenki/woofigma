/**
 * Represents a single SVG path command with its type and numeric arguments.
 */
export type PathCommand = {
  /** The command type (M, L, C, A, Z, etc.) - preserves original case for relative/absolute distinction */
  type: string;
  /** Numeric arguments for the command (coordinates, radii, flags, etc.) */
  args: Array<number>;
};

/**
 * Parses an SVG path data string into an array of structured command objects.
 *
 * This function tokenizes the path string by identifying command letters and extracting
 * their associated numeric arguments. It handles various number formats including
 * scientific notation and deals with edge cases like consecutive minus signs.
 *
 * @param d - The SVG path data string (value of the 'd' attribute)
 * @returns Array of PathCommand objects representing the parsed path
 *
 * @example
 * ```typescript
 * const commands = parseSVGPath("M10,20 L30,40 C50,60 70,80 90,100 Z");
 * // Returns: [
 * //   { type: "M", args: [10, 20] },
 * //   { type: "L", args: [30, 40] },
 * //   { type: "C", args: [50, 60, 70, 80, 90, 100] },
 * //   { type: "Z", args: [] }
 * // ]
 *
 * const complexPath = parseSVGPath("M1.5e2-1.2e1");
 * // Handles scientific notation and consecutive minus signs
 * // Returns: [{ type: "M", args: [150, -12] }]
 * ```
 *
 * @remarks
 * The parser:
 * - Preserves original command case (M vs m) for relative/absolute distinction
 * - Handles comma and whitespace separators
 * - Supports scientific notation (e.g., 1.5e2)
 * - Correctly parses consecutive minus signs (e.g., "10-5" becomes [10, -5])
 * - Includes Z/z commands even when they have no arguments
 * - Filters out empty or invalid commands
 */
export function parseSVGPath(d: string): Array<PathCommand> {
  const commands: Array<PathCommand> = [];
  // Regex to match command letters followed by their arguments
  const regex = /([ACHLMQSTVZachlmqstvz])([^ACHLMQSTVZachlmqstvz]*)/g;
  let match = regex.exec(d);

  while (match !== null) {
    const type = match[1];
    if (!type) {
      throw new Error("Invalid path data");
    }

    let argsString = (match[2] ?? "").trim();
    // Normalize separators: replace commas with spaces
    argsString = argsString.replace(/,/g, " ");

    // Handle consecutive minus signs by adding spaces before them
    argsString = argsString.replace(/(\d)-/g, "$1 -");
    argsString = argsString.replace(/(\.)-/g, "$1 -");

    // Extract numbers including scientific notation
    const numberRegex = /-?\d*\.?\d+(?:[Ee][+-]?\d+)?/g;
    const args: Array<number> = [];
    let numMatch = numberRegex.exec(argsString);
    while (numMatch !== null) {
      args.push(Number.parseFloat(numMatch[0]));
      numMatch = numberRegex.exec(argsString);
    }

    // Include command if it has arguments or is a close command
    if (args.length > 0 || type.toUpperCase() === "Z") {
      commands.push({ type, args });
    }

    match = regex.exec(d);
  }

  return commands;
}
