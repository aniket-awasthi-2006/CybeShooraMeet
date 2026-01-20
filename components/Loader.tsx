import React from "react";
import { HashLoader } from "react-spinners";

const Loader = () => {
    return (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-10 z-50'>
            <HashLoader color="indigo" size={80} />
        </div>
    );
};

export default Loader;