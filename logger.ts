import testContext from './testContext';


/*
In essence, this file serves the purpose of enabling logging within test scripts and configuring logging options
for better debugging and reporting during testing. It provides a Logger class with methods for logging informational
and error messages, along with a function to customize logging settings. By logging relevant information and errors
during test execution, testers and developers can gain insights into the behavior of the application under test, aiding
in effective debugging and reporting.
*/





// Exporting a new instance of a Logger class with two methods: info and error
export default new class Logger {
    // Method for logging informational messages
    info = async (msg: string) => {
        // Logging the message using the logger from the test context
        testContext.logger.info(msg);
        // Check if the message contains the word 'password' in any case
        if (!msg.toLowerCase().includes('password')) {
            // Log the message to the console if it does not contain 'password'
            console.log(msg);
        }
    }

    // Method for logging error messages
    error = async (msg: string) => {
        // Logging the error message using the logger from the test context
        testContext.logger.error(msg);
    }
}

// Importing required modules from Winston for logging configuration
import { transports, format } from "winston";

// Function for configuring logging options
export function options(loggerOptions: { fileName: string, logfileFolder: string }) {
    return {
        // Specify the transports for logging (writing to files in this case)
        transport: [
            // Creating a file transport to write logs to a file
            new transports.file({
                // Set the filename and folder for the log file
                filename: `${loggerOptions.logfileFolder}/${loggerOptions.fileName}.log`,
                // Set the log level to 'info'
                level: 'info',
                // Specify the log message format
                format: format.combine(
                    // Add a timestamp to log messages
                    format.timestamp({
                        format: 'YYYY-MM-DD HH:mm:ss'
                    }),
                    // Align log messages
                    format.align(),
                    // Format log messages for printing
                    format.printf(info => `[${(new Date().toLocaleString())}]  :  ${info.level}: ${info.message}`)
                )
            }),
        ]
    }
};
