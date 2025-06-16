exports.createEmployee = async (employeeData) => {
    // Create user
    const user = new User({
        name: employeeData.name,
        email: employeeData.email,
        password: employeeData.password,
        role: 'Employee'
    });
    await user.save();

    // Create employee
    const employee = new Employee({
        job_title: employeeData.job_title,
        user: user._id
    });
    await employee.save();

    return employee;
};
