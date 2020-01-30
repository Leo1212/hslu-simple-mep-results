// Initialize student object with default values.
const _Student = {
    isPartTime: false,
    studyTitle: '',
    studyAcronym: '',
    totalCredits: 0,
    totalGrades: 0,
    totalNumericMark: 0,
    numberOfNumericMarks: 0,
    totalNumericMarkWithF: 0,
    numberOfNumericMarksWithF: 0,
    gradesCount: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    creditsByModuleTypeCount: {
        Kernmodul: { current: 0, min: 66 },
        Projektmodul: { current: 0, min: 36 },
        Erweiterungsmodul: { current: 0, min: 42 },
        Majormodul: { current: 0, min: 24 },
        Zusatzmodul: { current: 0, min: 9 }
    }
}

/**
 * Gets the acronym of the students study.
 * @param {String} studyTitle
 * @returns {String} I, ICS or WI
 */
function getStudyAcronym(studyTitle) {
    const studyTitles = {
        "bachelor of science in information & cyber security": "ICS",
        "bachelor of science in information": "I",
        "bachelor of science in computer science": "I",
        "bachelor of science in wirtschaftsinformatik": "WI",
        "bachelor of science in informatik": "I"
    }
    studyTitle = studyTitle.toLowerCase().replace(/[0-9]/g, '').trim();
    return studyTitles[studyTitle];
}

/**
 * Gets the title of the students study
 * @returns {String}
 */

function getStudyTitle(studentData) {

    const searchStringStart = '<h2 class="section-title large-20 columns nospace">';
    const searchStringEnd = "</h2>";

    studentData = studentData.split(searchStringStart);

    if (studentData[2]) {
        title = studentData[2].split(searchStringEnd)[0].trim();
    }
    return title;
}

/**
 * Return if Student is Partime
 * @returns {boolean}
 *  */
function isPartTimeStudent(studentData) {

    const searchStringStart = '<dt>Ausbildungsform</dt>';
    const searchStringEnd = "</dd>";

    return studentData.split(searchStringStart)[1].split(searchStringEnd)[0].includes('Berufsbegleitend');
}

async function getStudentInformations() {
    const URL = "https://mycampus.hslu.ch/de-ch/stud-i/mein-studium/meine-daten/"

    let studentData = await fetch((URL))
        .then(response => response.text());

    _Student.isPartTime = isPartTimeStudent(studentData);

    _Student.studyTitle = getStudyTitle(studentData);
    _Student.studyAcronym = getStudyAcronym(_Student.studyTitle);
}

/**
 * Create one cell of the modules table.
 * @param {string} text to put into the cell.
 */
function createModulesTableCell(text) {
    let td = document.createElement('td');
    td.appendChild(document.createTextNode(text));
    return td;
}

/**
 * Create one row of the modules table.
 */
function createModulesTableRow(parsedModule) {
    let tr = document.createElement('tr');
    tr.appendChild(createModulesTableCell(parsedModule.name));
    tr.appendChild(createModulesTableCell(parsedModule.moduleType));
    tr.appendChild(createModulesTableCell(parsedModule.credits));
    tr.appendChild(createModulesTableCell(parsedModule.mark));
    tr.appendChild(createModulesTableCell(parsedModule.grade));
    return tr;
}

/**
 * Insert a cell into the a row of a table. Text is bold.
 *
 * @param {number} index where to place the header cell.
 * @param {any} row to insert cell.
 * @param {string} text to write into the cell.
 */
function insertTableHeaderCell(index, row, text) {
    let cell = row.insertCell(index);
    cell.appendChild(document.createTextNode(text));
    cell.setAttribute('style', 'font-weight: bold');
}

/**
 * Dynamically creates a table that contains all modules the student has visited.
 * Shows Module Identifier (Nummer), Credits (ECTS), Module-Type, Numeric Mark (1-6) and Grade (A-F).
 *
 */
function createModulesTable(div, modules) {

    let table = document.createElement('table');

    let header = table.createTHead();
    let headerRow = header.insertRow(0);
    insertTableHeaderCell(0, headerRow, 'Modul-Name');
    insertTableHeaderCell(1, headerRow, 'Modul-Typ');
    insertTableHeaderCell(2, headerRow, 'ECTS-Punkte');
    insertTableHeaderCell(3, headerRow, 'Bewertung');
    insertTableHeaderCell(4, headerRow, 'Grad');

    let tbody = document.createElement('tbody');

    modules.forEach(parsedModule => {
        let tr = createModulesTableRow(parsedModule);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    div.insertBefore(table, div.firstChild);
}

/*
 * Create a table that shows how many ECTS for each type of module have been achieved.
 */
async function createCreditsByModuleTypeTable(div) {

    let template = await fetch(Helpers.getExtensionInternalFileUrl('templates/credits_by_module_type_table.html'))
        .then(response => response.text());
    let creditsByModuleTypeTable = document.createElement('div');
    creditsByModuleTypeTable.innerHTML = template;
    div.insertBefore(creditsByModuleTypeTable, div.firstChild);

    for (let moduleKey in _Student.creditsByModuleTypeCount) {
        const creditProgressBar = document.getElementById('ECTS-' + moduleKey);
        const creditProgressText = document.getElementById('ECTS-Text-' + moduleKey);

        const progress = Helpers.calculateProgress(
            _Student.creditsByModuleTypeCount[moduleKey].current,
            _Student.creditsByModuleTypeCount[moduleKey].min)
        creditProgressText.innerText =
            _Student.creditsByModuleTypeCount[moduleKey].current + ' (' + progress + '%)';
        creditProgressBar.style.width = progress + '%';
    }
}

/*
 * Creates a table that puts each possible grade (A-F) in comparison.
 * Shown is, how many time a grade has been achieved and the percentage,
 * in comparison with the other grades.
 */
async function createGradesOverviewTable(div) {

    let gradesTableTemplate = await fetch(Helpers.getExtensionInternalFileUrl('templates/grades_table.html'))
        .then(response => response.text());

    let gradeOverviewTable = document.createElement('div');
    for (let gradeId in _Student.gradesCount) {
        gradesTableTemplate = String(gradesTableTemplate).replace('count-' + gradeId, _Student.gradesCount[gradeId]);
        let gradePercentageRounded = Math.round(10000 * _Student.gradesCount[gradeId] / _Student.totalGrades) / 100;
        gradesTableTemplate = gradesTableTemplate.replace('percentage-' + gradeId, gradePercentageRounded + "%");
    }
    gradeOverviewTable.innerHTML = gradesTableTemplate;
    div.insertBefore(gradeOverviewTable, div.firstChild);
}

/*
 * Create a heading that displays the number of achieved credits.
 */
function createTotalCreditsTitle(div) {
    const progress = Helpers.calculateProgress(_Student.totalCredits, 180);
    Helpers.addTitleToDocument(div, 'ECTS-Punkte: ' + _Student.totalCredits + '/180 (' + progress + '%)');
}

/*
 * Create a progress bar that visualizes the number of achieved credits.
 */
function createTotalCreditsProgressBar(div) {

    const container = document.createElement('div');
    container.classList = 'total-progress-container';

    const progressBar = document.createElement('div');
    const progress = Helpers.calculateProgress(_Student.totalCredits, 180);
    progressBar.classList = 'total-progress progress';
    progressBar.style.width = progress + '%';

    container.appendChild(progressBar);

    div.insertBefore(container, div.firstChild);
}
function createStudyTitle(div) {

    let studyTitleTitle = document.createElement('h1');
    studyTitleTitle.appendChild(document.createTextNode('Studium: ' + _Student.studyTitle));
    div.insertBefore(studyTitleTitle, div.firstChild);
}

/*
 * Create a heading that displays the average mark over all modules.
 * Modules with grade F are not counted in the average.
 * A second average is displayed, where the modules with grade F are taken into account.
 */
function createAverageMarkTitle(div) {
    let average = Number(_Student.totalNumericMark / _Student.numberOfNumericMarks).toFixed(2);
    let averageWithF = Number(_Student.totalNumericMarkWithF / _Student.numberOfNumericMarksWithF).toFixed(2);
    Helpers.addTitleToDocument(div, 'Noten Ø: ' + average + ' (Ø mit F: ' + averageWithF + ')')
}

/*
 * Helper method to read a file that is included in this browser extension.
 * The file needs to be registered in manifest.json!
 * Chome and Firefox have different APIs for this.
 */
function getExtensionInternalFileUrl(filePath) {

    let internal_file;
    if (typeof browser !== 'undefined') {
        // firefox
        internal_file = browser.runtime.getURL(filePath);
    }
    else {
        // chrome
        internal_file = chrome.runtime.getURL(filePath);
    }
    return internal_file;
}


function calculateStats(modules) {

    modules.forEach(parsedModule => {
        if (parsedModule.grade
            && parsedModule.grade != null
            && parsedModule.grade != ''
            && parsedModule.grade != 'n/a') {
            _Student.gradesCount[parsedModule.grade]++;
            _Student.totalGrades++;
        }
        if (parsedModule.passed) {
            let credits = Number(parsedModule.credits);
            _Student.totalCredits += credits;
            let moduleType = parsedModule.moduleType;
            if (moduleType in _Student.creditsByModuleTypeCount) {
                _Student.creditsByModuleTypeCount[moduleType].current += credits;
            }
        }
        // if cell is empty, Number('') returns 0!
        numericMark = Number(parsedModule.mark)
        if (!isNaN(numericMark) && numericMark != 0) {
            _Student.totalNumericMarkWithF += numericMark;
            _Student.numberOfNumericMarksWithF++;
            if (parsedModule.passed) {
                _Student.totalNumericMark += numericMark;
                _Student.numberOfNumericMarks++;
            }
        }
    });
}

const getBurndownValue = (creditsDoneBySemesterCount, semester) => {
    let burndownValue = 180;
    for (let index = 0; index <= semester; index++) {
        burndownValue -= creditsDoneBySemesterCount[index]
    }
    return burndownValue;
}

const getIdealBurndownDataForNumberOfSemesters = (numberOfSemesters) => {
    let data = []
    for (let i = 0; i <= numberOfSemesters; i++) {
        data.push(180 / numberOfSemesters * (numberOfSemesters-i));
    }
    return data;
}

/**
 * Create a burndown chart that visualizes the remaining credits
 *   in comparison with the ideal remaining credits for each semester.
 * On the same chart is a bar chart that shows how many credits were
 *   done each semester.
 *
 * @param div: The div to place the chart in.
 * @param modules: A list of all modules of the student.
 */
function createChart(div, modules) {
    // the chart is drawn on this canvas
    const canvas = document.createElement("canvas");
    div.insertBefore(canvas, div.firstChild);

    // Semester 0 is the start. Will always be 0 credits.
    const creditsDoneBySemesterCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    // calculate how many credits were achieved for each semester
    modules.forEach(m => {
        if (m.grade != 'F' && m.semester != undefined) {
            creditsDoneBySemesterCount[m.semester] += Number(m.credits);
        }
    })

    // chart colors
    const colorHsluDarkBlueTransparent = 'rgba(65, 94, 108, 0.5)';
    const colorLightBlueTransparent = 'rgba(135, 206, 235, 0.5)';
    const colorRedTransparent = 'rgba(255, 206, 235, 0.5)';

    // chart properties
    const chartType = 'line'
    const labels = creditsDoneBySemesterCount.map((_, i, __) => 'Semester ' + i);
    const yAxis2 = 'y-axis-2';
    const yAxis1 = 'y-axis-1';

    let chartData = {
        labels: labels,
        datasets: [
            {
                // bars for credits achieved by semester
                label: 'Total Credits by Semster',
                data: creditsDoneBySemesterCount,
                backgroundColor: colorHsluDarkBlueTransparent,
                type: 'bar', // only this dataset should be shown as bars
                yAxisID: yAxis2
            },
            {
                // burndown line for students remaining cretits
                label: 'Your remaining credits',
                data: creditsDoneBySemesterCount.map((_, i, __) => getBurndownValue(creditsDoneBySemesterCount, i)),
                backgroundColor: colorLightBlueTransparent,
                yAxisID: yAxis1
            },
            {
                // reference burndown line to reach 0 remaining credits by the end of 6 or 8 semesters
                label: 'Ideal remaining credits ' + (_Student.isPartTime ? '(part time)' : '(full time)'),
                data: _Student.isPartTime
                    ? getIdealBurndownDataForNumberOfSemesters(8)
                    : getIdealBurndownDataForNumberOfSemesters(6),
                backgroundColor: colorRedTransparent,
                yAxisID: yAxis1
            }
        ]
    }

    let chartOptions = {
        scales: {
            yAxes: [
                {
                    ticks: {
                        beginAtZero: true
                    },
                    display: true,
                    position: 'left',
                    scaleLabel: {
                        display: true,
                        labelString: 'Total remaining credits'
                    },
                    id: yAxis1
                },
                {
                    ticks: {
                        suggestedMin: 0,
                        suggestedMax: 180
                    },
                    type: 'linear',
                    display: true,
                    position: 'right',
                    scaleLabel: {
                        display: true,
                        labelString: 'Credits done'
                    },
                    id: yAxis2,
                }
            ],
            xAxes: [{
                display: true
            }]
        }
    }

    new Chart(canvas, {
        type: chartType,
        data: chartData,
        options: chartOptions
    });
}

async function generateHtml(modules) {

    // remove clutter
    try {
        document.getElementById('intro').remove();
        document.getElementsByClassName('sidebar medium-7 columns mobile-column')[0].remove();
    } catch (error) {
        console.log("NOTITLE, DONT CARE")
    }

    let div = document.getElementsByClassName('row teaser-section None')[0];
    if (!modules) {
        // API call was blocked.
        const p = document.createElement('p');
        p.innerHTML = 'HSLU Simple MEP Results Extension failed to load. The API \
            has blocked the request. Please try again later. \
            More infos on GitHub: <a href="https://github.com/eddex/hslu-simple-mep-results/issues/16" \
            >Issue #16</a>';
        div.insertBefore(p, div.firstChild);
        return;
    }

    calculateStats(modules);
    createModulesTable(div, modules);
    Helpers.addTitleToDocument(div, 'Modulübersicht');

    await createGradesOverviewTable(div);
    createAverageMarkTitle(div);

    await createCreditsByModuleTypeTable(div);
    Helpers.addTitleToDocument(div, 'Modultypen Übersicht');
    createChart(div, modules);
    createTotalCreditsProgressBar(div);
    createTotalCreditsTitle(div);

    createStudyTitle(div);
}

getStudentInformations()
    .then(
        ModuleParser.generateModuleObjects(_Student.studyAcronym)
            .then(modules => generateHtml(modules))
            .catch(e => {
                console.log("Booo");
                console.log(e);
            })
    );